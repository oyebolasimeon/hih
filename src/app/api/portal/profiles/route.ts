import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";
import { actorFromUser, writeAudit } from "@/lib/audit";

const createSchema = z.object({
  type: z.enum(["student", "tenant", "landlord", "estate_manager"]),
  displayName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  studentFields: z
    .object({
      institution: z.string().trim().optional(),
      studentIdNumber: z.string().trim().optional(),
    })
    .optional(),
  landlordFields: z
    .object({
      bankAccountLast4: z.string().trim().optional(),
      proofOfAddressUrl: z.string().url().optional().or(z.literal("")),
    })
    .optional(),
  estateManagerFields: z
    .object({
      businessName: z.string().trim().optional(),
      cacNumber: z.string().trim().optional(),
      businessAddress: z.string().trim().optional(),
      authorizedRepName: z.string().trim().optional(),
    })
    .optional(),
});

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const profiles = await Profile.find({ userId: user.id }).lean();
  const dbUser = await User.findById(user.id).select("activeProfileId").lean();

  return NextResponse.json({
    activeProfileId: dbUser?.activeProfileId
      ? String(dbUser.activeProfileId)
      : null,
    profiles: profiles.map((p) => ({
      id: String(p._id),
      type: p.type,
      status: p.status,
      displayName: p.displayName,
      phone: p.phone,
      studentFields: p.studentFields || null,
      landlordFields: p.landlordFields || null,
      estateManagerFields: p.estateManagerFields || null,
      verifiedAt: p.verifiedAt || null,
      createdAt: p.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile data." }, { status: 400 });
  }

  await connectDB();
  const existing = await Profile.findOne({
    userId: user.id,
    type: parsed.data.type,
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already have a profile of this type." },
      { status: 409 }
    );
  }

  const displayName =
    parsed.data.displayName || user.name || parsed.data.type.replace("_", " ");

  const profile = await Profile.create({
    userId: user.id,
    type: parsed.data.type,
    status: "draft",
    displayName,
    phone: parsed.data.phone || "",
    studentFields: parsed.data.studentFields,
    landlordFields: parsed.data.landlordFields,
    estateManagerFields: parsed.data.estateManagerFields,
  });

  const dbUser = await User.findById(user.id);
  if (dbUser && !dbUser.activeProfileId) {
    dbUser.activeProfileId = profile._id;
    await dbUser.save();
  }

  await writeAudit({
    action: "profile.create",
    actor: actorFromUser(user),
    entityType: "profile",
    entityId: String(profile._id),
    summary: `Created ${profile.type} profile`,
  });

  return NextResponse.json(
    {
      profile: {
        id: String(profile._id),
        type: profile.type,
        status: profile.status,
        displayName: profile.displayName,
      },
    },
    { status: 201 }
  );
}
