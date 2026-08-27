import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Application } from "@/models/Application";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";
import { Lease } from "@/models/Lease";

export type MessageContact = {
  userId: string;
  name: string;
  email: string;
  listingId: string | null;
  listingTitle: string | null;
  context: string;
};

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();

  const myProfiles = await Profile.find({ userId: user.id }).select("_id").lean();
  const myProfileIds = myProfiles.map((p) => p._id);
  const myProfileIdSet = new Set(myProfileIds.map(String));

  const [applications, leases] = await Promise.all([
    Application.find({
      $or: [
        { applicantUserId: user.id },
        { landlordProfileId: { $in: myProfileIds } },
      ],
    })
      .sort({ updatedAt: -1 })
      .limit(80)
      .lean(),
    Lease.find({
      $or: [
        { tenantProfileId: { $in: myProfileIds } },
        { landlordProfileId: { $in: myProfileIds } },
      ],
    })
      .sort({ updatedAt: -1 })
      .limit(40)
      .lean(),
  ]);

  const listingIds = [
    ...new Set([
      ...applications.map((a) => String(a.listingId)),
      ...leases.map((l) => String(l.listingId)),
    ]),
  ];

  const tenantProfileIds = [
    ...new Set(
      leases
        .filter((l) => myProfileIdSet.has(String(l.landlordProfileId)))
        .map((l) => String(l.tenantProfileId))
    ),
  ];

  const [listings, tenantProfiles] = await Promise.all([
    Listing.find({ _id: { $in: listingIds } })
      .select("title ownerUserId")
      .lean(),
    tenantProfileIds.length
      ? Profile.find({ _id: { $in: tenantProfileIds } })
          .select("userId")
          .lean()
      : Promise.resolve([]),
  ]);

  const listingMap = new Map(listings.map((l) => [String(l._id), l]));
  const tenantUserByProfile = new Map(
    tenantProfiles.map((p) => [String(p._id), String(p.userId)])
  );

  type Candidate = {
    userId: string;
    listingId: string | null;
    listingTitle: string | null;
    context: string;
  };

  const candidates: Candidate[] = [];

  for (const app of applications) {
    const listing = listingMap.get(String(app.listingId));
    const listingTitle = listing?.title || null;
    const listingId = String(app.listingId);

    if (String(app.applicantUserId) === user.id) {
      const ownerId = listing ? String(listing.ownerUserId) : null;
      if (ownerId && ownerId !== user.id) {
        candidates.push({
          userId: ownerId,
          listingId,
          listingTitle,
          context: "Application",
        });
      }
    } else {
      const applicantId = String(app.applicantUserId);
      if (applicantId !== user.id) {
        candidates.push({
          userId: applicantId,
          listingId,
          listingTitle,
          context: "Applicant",
        });
      }
    }
  }

  for (const lease of leases) {
    const listing = listingMap.get(String(lease.listingId));
    const listingTitle = listing?.title || null;
    const listingId = String(lease.listingId);
    const isLandlord = myProfileIdSet.has(String(lease.landlordProfileId));

    if (isLandlord) {
      const tenantUserId = tenantUserByProfile.get(String(lease.tenantProfileId));
      if (tenantUserId && tenantUserId !== user.id) {
        candidates.push({
          userId: tenantUserId,
          listingId,
          listingTitle,
          context: "Lease",
        });
      }
    } else if (listing) {
      const ownerId = String(listing.ownerUserId);
      if (ownerId !== user.id) {
        candidates.push({
          userId: ownerId,
          listingId,
          listingTitle,
          context: "Lease",
        });
      }
    }
  }

  const seen = new Set<string>();
  const unique: Candidate[] = [];
  for (const c of candidates) {
    const key = `${c.userId}:${c.listingId || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(c);
  }

  const userIds = [...new Set(unique.map((c) => c.userId))];
  const users = await User.find({ _id: { $in: userIds } })
    .select("name email")
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const contacts: MessageContact[] = unique
    .map((c) => {
      const u = userMap.get(c.userId);
      if (!u) return null;
      return {
        userId: c.userId,
        name: u.name || "User",
        email: u.email || "",
        listingId: c.listingId,
        listingTitle: c.listingTitle,
        context: c.context,
      };
    })
    .filter(Boolean) as MessageContact[];

  return NextResponse.json({ contacts });
}
