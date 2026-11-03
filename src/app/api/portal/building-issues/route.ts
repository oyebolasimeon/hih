import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { reviewBuildingIssueWithAiPm } from "@/lib/building-issue-ai";
import {
  notifyUser,
  requireActiveProfile,
} from "@/lib/profile-context";
import { assertListingAccess } from "@/lib/property-access";
import { BuildingIssue } from "@/models/BuildingIssue";
import { Listing } from "@/models/Listing";
import { MaintenanceRequest } from "@/models/MaintenanceRequest";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";

function serializeIssue(
  i: Record<string, unknown>,
  extras?: Record<string, unknown>
) {
  return {
    id: String(i._id),
    listingId: String(i.listingId),
    leaseId: i.leaseId ? String(i.leaseId) : null,
    reporterUserId: String(i.reporterUserId),
    landlordUserId: String(i.landlordUserId),
    category: i.category,
    title: i.title,
    description: i.description,
    locationNote: i.locationNote || "",
    priority: i.priority,
    status: i.status,
    evidence: i.evidence || [],
    aiRecommendation: i.aiRecommendation || null,
    aiConfidence: i.aiConfidence ?? null,
    aiSummary: i.aiSummary || "",
    aiReasons: i.aiReasons || [],
    recommendedLandlordActions: i.recommendedLandlordActions || [],
    proofSufficient: i.proofSufficient ?? null,
    landlordNotes: i.landlordNotes || "",
    landlordActionTaken: i.landlordActionTaken || "",
    maintenanceRequestId: i.maintenanceRequestId
      ? String(i.maintenanceRequestId)
      : null,
    closedAt: i.closedAt || null,
    timeline: i.timeline || [],
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
    ...extras,
  };
}

async function applyAiAndMaybeEscalate(issue: InstanceType<typeof BuildingIssue>) {
  const listing = await Listing.findById(issue.listingId);
  if (!listing) return issue;

  const address = `${listing.address.street}, ${listing.address.city}, ${listing.address.state}`;
  const ai = await reviewBuildingIssueWithAiPm({
    category: issue.category,
    title: issue.title,
    description: issue.description,
    locationNote: issue.locationNote,
    evidenceUrls: (issue.evidence || []).map(
      (e: { url: string }) => e.url
    ),
    propertyTitle: listing.title,
    propertyAddress: address,
  });

  issue.aiRecommendation = ai.recommendation;
  issue.aiConfidence = ai.confidence;
  issue.aiSummary = ai.summary;
  issue.aiReasons = ai.reasons;
  issue.proofSufficient = ai.proofSufficient;
  issue.recommendedLandlordActions = ai.recommendedLandlordActions;
  issue.priority = ai.suggestedPriority;
  issue.timeline.push({
    at: new Date(),
    actor: "ai_pm",
    type: "ai_review",
    message: `${ai.recommendation}: ${ai.summary}`,
  });

  if (ai.recommendation === "needs_more_proof") {
    issue.status = "needs_more_proof";
    await issue.save();
    await notifyUser({
      userId: String(issue.reporterUserId),
      type: "building_issue.needs_proof",
      title: "More proof needed",
      body: `AI Property Manager needs clearer proof for “${issue.title}”. ${ai.summary}`,
      link: "/portal/building-issues",
    }).catch(() => undefined);
    return issue;
  }

  if (ai.recommendation === "dismiss") {
    issue.status = "dismissed";
    issue.closedAt = new Date();
    issue.closedBy = "ai_pm";
    issue.timeline.push({
      at: new Date(),
      actor: "ai_pm",
      type: "dismissed",
      message: "Issue dismissed by AI Property Manager.",
    });
    await issue.save();
    await notifyUser({
      userId: String(issue.reporterUserId),
      type: "building_issue.dismissed",
      title: "Issue not escalated",
      body: `“${issue.title}” was not escalated: ${ai.summary}`,
      link: "/portal/building-issues",
    }).catch(() => undefined);
    return issue;
  }

  // escalate or manual_review → escalate to landlord with guidance
  issue.status = "escalated";
  issue.timeline.push({
    at: new Date(),
    actor: "ai_pm",
    type: "escalated",
    message:
      "Escalated to landlord with recommended actions from AI Property Manager.",
  });

  const maintenance = await MaintenanceRequest.create({
    listingId: issue.listingId,
    requesterUserId: issue.reporterUserId,
    title: `[AI PM] ${issue.title}`,
    description: [
      issue.description,
      "",
      `Category: ${issue.category}`,
      issue.locationNote ? `Location: ${issue.locationNote}` : "",
      "",
      "AI Property Manager summary:",
      ai.summary,
      "",
      "Recommended landlord actions:",
      ...ai.recommendedLandlordActions.map((a, idx) => `${idx + 1}. ${a}`),
    ]
      .filter(Boolean)
      .join("\n"),
    priority:
      ai.suggestedPriority === "urgent"
        ? "high"
        : ai.suggestedPriority === "low"
          ? "low"
          : ai.suggestedPriority === "high"
            ? "high"
            : "medium",
    status: "open",
  });
  issue.maintenanceRequestId = maintenance._id;
  await issue.save();

  const landlord = await User.findById(issue.landlordUserId)
    .select("email name")
    .lean();
  await notifyUser({
    userId: String(issue.landlordUserId),
    type: "building_issue.escalated",
    title: "Building issue escalated",
    body: `AI Property Manager escalated “${issue.title}” on “${listing.title}” (${ai.suggestedPriority}). Open Building issues for recommended actions.`,
    link: "/portal/building-issues",
    meta: { issueId: String(issue._id) },
    email: landlord?.email
      ? {
          to: landlord.email,
          subject: `Building issue · ${issue.title}`,
        }
      : undefined,
  }).catch(() => undefined);

  await notifyUser({
    userId: String(issue.reporterUserId),
    type: "building_issue.escalated_tenant",
    title: "Issue escalated to landlord",
    body: `AI Property Manager validated “${issue.title}” and notified your landlord with next steps.`,
    link: "/portal/building-issues",
  }).catch(() => undefined);

  return issue;
}

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const owned = await Listing.find({ ownerUserId: user.id }).select("_id").lean();
  const ownedIds = owned.map((l) => l._id);

  const rows = await BuildingIssue.find({
    $or: [
      { reporterUserId: user.id },
      { landlordUserId: user.id },
      { listingId: { $in: ownedIds } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const listingIds = [...new Set(rows.map((r) => String(r.listingId)))];
  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("title address")
    .lean();
  const listingMap = new Map(listings.map((l) => [String(l._id), l]));

  return NextResponse.json({
    issues: rows.map((r) => {
      const listing = listingMap.get(String(r.listingId));
      const viewerRole =
        String(r.reporterUserId) === user.id
          ? "tenant"
          : String(r.landlordUserId) === user.id ||
              ownedIds.some((id) => String(id) === String(r.listingId))
            ? "landlord"
            : "other";
      return serializeIssue(r as unknown as Record<string, unknown>, {
        viewerRole,
        listingTitle: listing?.title || null,
        listingCity: listing?.address?.city || null,
      });
    }),
  });
}

const evidenceSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional(),
  kind: z.enum(["photo", "video", "document"]).default("photo"),
  caption: z.string().trim().max(240).optional(),
});

const createSchema = z.object({
  listingId: z.string().min(1),
  category: z.enum([
    "plumbing",
    "electrical",
    "structural",
    "pest",
    "security",
    "common_area",
    "water",
    "waste",
    "noise_facility",
    "other",
  ]),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(4000),
  locationNote: z.string().trim().max(240).optional(),
  evidence: z.array(evidenceSchema).max(8).default([]),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, ["tenant", "student"]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 400 }
    );
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.listingId)) {
    return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  }

  const access = await assertListingAccess({
    userId: user.id,
    profile: active.profile,
    listingId: parsed.data.listingId,
    requireLeaseForTenant: true,
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const listing = access.listing;
  const landlordProfile = await Profile.findOne({
    userId: listing.ownerUserId,
    type: { $in: ["landlord", "estate_manager"] },
  })
    .sort({ status: 1, updatedAt: -1 })
    .select("_id userId")
    .lean();

  if (!landlordProfile) {
    return NextResponse.json(
      { error: "Landlord profile not found for this property." },
      { status: 400 }
    );
  }

  await connectDB();
  let issue = await BuildingIssue.create({
    listingId: listing._id,
    leaseId: access.leaseId
      ? new mongoose.Types.ObjectId(access.leaseId)
      : undefined,
    reporterUserId: new mongoose.Types.ObjectId(user.id),
    reporterProfileId: active.profile._id,
    landlordUserId: listing.ownerUserId,
    landlordProfileId: landlordProfile._id,
    category: parsed.data.category,
    title: parsed.data.title,
    description: parsed.data.description,
    locationNote: parsed.data.locationNote,
    priority: "medium",
    status: "pending_ai",
    evidence: parsed.data.evidence.map((e) => ({
      ...e,
      uploadedAt: new Date(),
    })),
    timeline: [
      {
        at: new Date(),
        actor: "tenant",
        type: "submitted",
        message: "Tenant reported a building issue.",
      },
      {
        at: new Date(),
        actor: "ai_pm",
        type: "pending_ai",
        message: "AI Property Manager is reviewing proof and details.",
      },
    ],
  });

  issue = await applyAiAndMaybeEscalate(issue);

  await writeAudit({
    action: "building_issue.create",
    summary: `Building issue “${issue.title}” → ${issue.status}`,
    actor: actorFromUser(user),
    entityType: "building_issue",
    entityId: String(issue._id),
    metadata: {
      listingId: String(listing._id),
      aiRecommendation: issue.aiRecommendation,
      status: issue.status,
    },
    request: req,
  });

  return NextResponse.json(
    {
      issue: serializeIssue(issue.toObject() as unknown as Record<string, unknown>, {
        viewerRole: "tenant",
        listingTitle: listing.title,
        listingCity: listing.address?.city || null,
      }),
    },
    { status: 201 }
  );
}
