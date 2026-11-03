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
import { BuildingIssue } from "@/models/BuildingIssue";
import { Listing } from "@/models/Listing";
import { MaintenanceRequest } from "@/models/MaintenanceRequest";

type RouteCtx = { params: Promise<{ id: string }> };

async function loadAccessibleIssue(userId: string, id: string) {
  const issue = await BuildingIssue.findById(id);
  if (!issue) return { error: "Not found.", status: 404 as const };

  const isReporter = String(issue.reporterUserId) === userId;
  const isLandlord = String(issue.landlordUserId) === userId;
  const listing = await Listing.findById(issue.listingId).select("ownerUserId title address").lean();
  const isOwner = listing && String(listing.ownerUserId) === userId;

  if (!isReporter && !isLandlord && !isOwner) {
    return { error: "Forbidden.", status: 403 as const };
  }

  return {
    issue,
    listing,
    role: isReporter ? ("tenant" as const) : ("landlord" as const),
  };
}

export async function GET(_req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid issue." }, { status: 400 });
  }

  await connectDB();
  const loaded = await loadAccessibleIssue(user.id, id);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  const { issue, listing, role } = loaded;
  return NextResponse.json({
    issue: {
      id: String(issue._id),
      ...issue.toObject(),
      _id: undefined,
      listingId: String(issue.listingId),
      leaseId: issue.leaseId ? String(issue.leaseId) : null,
      maintenanceRequestId: issue.maintenanceRequestId
        ? String(issue.maintenanceRequestId)
        : null,
      viewerRole: role,
      listingTitle: listing?.title || null,
    },
  });
}

const patchSchema = z.object({
  action: z.enum([
    "add_proof",
    "revalidate",
    "landlord_ack",
    "landlord_progress",
    "close",
    "dismiss",
  ]),
  notes: z.string().trim().max(4000).optional(),
  actionTaken: z.string().trim().max(4000).optional(),
  evidence: z
    .array(
      z.object({
        url: z.string().url(),
        publicId: z.string().optional(),
        kind: z.enum(["photo", "video", "document"]).default("photo"),
        caption: z.string().trim().max(240).optional(),
      })
    )
    .max(8)
    .optional(),
});

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid issue." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  await connectDB();
  const loaded = await loadAccessibleIssue(user.id, id);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }
  const { issue, listing, role } = loaded;

  if (["closed", "dismissed"].includes(issue.status)) {
    return NextResponse.json(
      { error: "This case is already closed." },
      { status: 409 }
    );
  }

  if (parsed.data.action === "add_proof") {
    if (role !== "tenant") {
      return NextResponse.json(
        { error: "Only the reporting tenant can add proof." },
        { status: 403 }
      );
    }
    if (!parsed.data.evidence?.length) {
      return NextResponse.json(
        { error: "Attach at least one photo." },
        { status: 400 }
      );
    }
    for (const e of parsed.data.evidence) {
      issue.evidence.push({ ...e, uploadedAt: new Date() });
    }
    issue.status = "pending_ai";
    issue.timeline.push({
      at: new Date(),
      actor: "tenant",
      type: "proof_added",
      message: `Tenant added ${parsed.data.evidence.length} proof photo(s).`,
    });
    await issue.save();

    // Re-run AI immediately
    return revalidateAndRespond(issue, listing, user, req);
  }

  if (parsed.data.action === "revalidate") {
    if (role !== "tenant" && role !== "landlord") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    return revalidateAndRespond(issue, listing, user, req);
  }

  if (
    parsed.data.action === "landlord_ack" ||
    parsed.data.action === "landlord_progress"
  ) {
    if (role !== "landlord") {
      return NextResponse.json(
        { error: "Only the landlord can update progress." },
        { status: 403 }
      );
    }
    const active = await requireActiveProfile(user.id, [
      "landlord",
      "estate_manager",
    ]);
    if (!active.ok) {
      return NextResponse.json({ error: active.error }, { status: active.status });
    }

    if (!["escalated", "landlord_in_progress", "ai_validated"].includes(issue.status)) {
      return NextResponse.json(
        { error: "Issue is not awaiting landlord action." },
        { status: 409 }
      );
    }

    issue.status = "landlord_in_progress";
    if (parsed.data.notes) issue.landlordNotes = parsed.data.notes;
    if (parsed.data.actionTaken) {
      issue.landlordActionTaken = parsed.data.actionTaken;
    }
    issue.timeline.push({
      at: new Date(),
      actor: "landlord",
      type:
        parsed.data.action === "landlord_ack"
          ? "landlord_acknowledged"
          : "landlord_progress",
      message:
        parsed.data.actionTaken ||
        parsed.data.notes ||
        "Landlord updated the case.",
    });

    if (issue.maintenanceRequestId) {
      await MaintenanceRequest.findByIdAndUpdate(issue.maintenanceRequestId, {
        status: "in_progress",
        assignee: "Landlord / estate",
      }).catch(() => undefined);
    }

    await issue.save();
    await notifyUser({
      userId: String(issue.reporterUserId),
      type: "building_issue.landlord_update",
      title: "Landlord updated your issue",
      body: `Update on “${issue.title}”: ${
        parsed.data.actionTaken || parsed.data.notes || "In progress"
      }`,
      link: "/portal/building-issues",
    }).catch(() => undefined);

    await writeAudit({
      action: "building_issue.landlord_update",
      summary: `Landlord progress on “${issue.title}”`,
      actor: actorFromUser(user),
      entityType: "building_issue",
      entityId: String(issue._id),
      request: req,
    });

    return NextResponse.json({ ok: true, status: issue.status });
  }

  if (parsed.data.action === "close" || parsed.data.action === "dismiss") {
    issue.status = parsed.data.action === "dismiss" ? "dismissed" : "closed";
    issue.closedAt = new Date();
    issue.closedBy = role === "tenant" ? "tenant" : "landlord";
    if (parsed.data.notes) {
      if (role === "landlord") issue.landlordNotes = parsed.data.notes;
    }
    if (parsed.data.actionTaken) {
      issue.landlordActionTaken = parsed.data.actionTaken;
    }
    issue.timeline.push({
      at: new Date(),
      actor: role === "tenant" ? "tenant" : "landlord",
      type: issue.status,
      message:
        parsed.data.notes ||
        parsed.data.actionTaken ||
        `Case ${issue.status} by ${role}.`,
    });

    if (issue.maintenanceRequestId) {
      await MaintenanceRequest.findByIdAndUpdate(issue.maintenanceRequestId, {
        status: "done",
      }).catch(() => undefined);
    }

    await issue.save();

    const notifyId =
      role === "tenant"
        ? String(issue.landlordUserId)
        : String(issue.reporterUserId);
    await notifyUser({
      userId: notifyId,
      type: "building_issue.closed",
      title: issue.status === "dismissed" ? "Issue dismissed" : "Issue closed",
      body: `“${issue.title}” is now ${issue.status}.`,
      link: "/portal/building-issues",
    }).catch(() => undefined);

    await writeAudit({
      action: `building_issue.${issue.status}`,
      summary: `${issue.status} building issue “${issue.title}”`,
      actor: actorFromUser(user),
      entityType: "building_issue",
      entityId: String(issue._id),
      request: req,
    });

    return NextResponse.json({ ok: true, status: issue.status });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

async function revalidateAndRespond(
  issue: InstanceType<typeof BuildingIssue>,
  listing: { title?: string; address?: { street?: string; city?: string; state?: string } } | null,
  user: { id: string; email?: string | null; name?: string | null },
  req: Request
) {
  const address = listing?.address
    ? `${listing.address.street || ""}, ${listing.address.city || ""}, ${listing.address.state || ""}`
    : "";
  const ai = await reviewBuildingIssueWithAiPm({
    category: issue.category,
    title: issue.title,
    description: issue.description,
    locationNote: issue.locationNote,
    evidenceUrls: (issue.evidence || []).map(
      (e: { url: string }) => e.url
    ),
    propertyTitle: listing?.title || "Property",
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
    message: `Re-check · ${ai.recommendation}: ${ai.summary}`,
  });

  if (ai.recommendation === "needs_more_proof") {
    issue.status = "needs_more_proof";
  } else if (ai.recommendation === "dismiss") {
    issue.status = "dismissed";
    issue.closedAt = new Date();
    issue.closedBy = "ai_pm";
  } else {
    const wasEscalated = ["escalated", "landlord_in_progress"].includes(
      issue.status
    );
    issue.status = "escalated";
    if (!wasEscalated && !issue.maintenanceRequestId) {
      const maintenance = await MaintenanceRequest.create({
        listingId: issue.listingId,
        requesterUserId: issue.reporterUserId,
        title: `[AI PM] ${issue.title}`,
        description: [
          issue.description,
          "",
          "AI Property Manager summary:",
          ai.summary,
          "",
          "Recommended landlord actions:",
          ...ai.recommendedLandlordActions.map((a, i) => `${i + 1}. ${a}`),
        ].join("\n"),
        priority:
          ai.suggestedPriority === "urgent" || ai.suggestedPriority === "high"
            ? "high"
            : ai.suggestedPriority === "low"
              ? "low"
              : "medium",
        status: "open",
      });
      issue.maintenanceRequestId = maintenance._id;
      await notifyUser({
        userId: String(issue.landlordUserId),
        type: "building_issue.escalated",
        title: "Building issue escalated",
        body: `AI Property Manager escalated “${issue.title}”. See recommended actions.`,
        link: "/portal/building-issues",
      }).catch(() => undefined);
    }
  }

  await issue.save();
  await writeAudit({
    action: "building_issue.revalidate",
    summary: `AI PM revalidated “${issue.title}” → ${issue.status}`,
    actor: actorFromUser(user),
    entityType: "building_issue",
    entityId: String(issue._id),
    request: req,
  });

  return NextResponse.json({
    ok: true,
    status: issue.status,
    aiRecommendation: issue.aiRecommendation,
    aiSummary: issue.aiSummary,
    recommendedLandlordActions: issue.recommendedLandlordActions,
  });
}
