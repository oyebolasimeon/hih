import type { IListing } from "@/models/Listing";
import { Listing } from "@/models/Listing";
import { Admin } from "@/models/Admin";
import { User } from "@/models/User";
import { reviewListingWithAi } from "@/lib/listing-ai-review";
import { notifyUser } from "@/lib/profile-context";
import { getEnvAdminEmails, hasPermission, type Permission } from "@/lib/rbac";
import { writeAudit, type AuditActor } from "@/lib/audit";

function imageUrls(listing: IListing | InstanceType<typeof Listing>) {
  return (listing.images || [])
    .filter(
      (i: { mediaType?: string; url?: string }) =>
        (i.mediaType || "image") !== "video"
    )
    .map((i: { url?: string }) => i.url || "")
    .filter(Boolean);
}

async function findListingReviewerUserIds(): Promise<
  { userId: string; email: string; name?: string }[]
> {
  const admins = await Admin.find({ active: true }).lean();
  const envEmails = new Set(getEnvAdminEmails());
  const byEmail = new Map<string, { userId: string; email: string; name?: string }>();

  for (const a of admins) {
    const perms = (a.permissions || []) as Permission[];
    const roleOk =
      a.role === "superadmin" ||
      hasPermission(perms, "listings:verify") ||
      hasPermission(perms, "listings:read");
    if (!roleOk) continue;
    const email = String(a.email || "").toLowerCase();
    if (!email) continue;
    byEmail.set(email, {
      userId: String(a.userId),
      email,
      name: a.name || undefined,
    });
  }

  if (envEmails.size) {
    const users = await User.find({
      email: { $in: [...envEmails] },
    })
      .select("email name")
      .lean();
    for (const u of users) {
      const email = String(u.email || "").toLowerCase();
      if (!email) continue;
      byEmail.set(email, {
        userId: String(u._id),
        email,
        name: u.name || undefined,
      });
    }
  }

  return [...byEmail.values()];
}

/**
 * Run AI review on a listing. Never sets verificationStatus to verified.
 * Escalates to admin (in-app + email) when AI is not satisfied or always for pending publish.
 */
export async function runListingAiVerification(input: {
  listing: InstanceType<typeof Listing>;
  actor?: AuditActor | null;
  /** Why this run happened */
  trigger: "create" | "publish" | "update" | "occupied_onboard";
}) {
  const listing = input.listing;
  const address = `${listing.address.street}, ${listing.address.city}, ${listing.address.state}`;
  const priceLabel = `${listing.price.currency} ${listing.price.amount.toLocaleString()} / ${listing.price.period}`;

  const ai = await reviewListingWithAi({
    title: listing.title,
    description: listing.description,
    listingType: listing.listingType,
    address,
    priceLabel,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    sizeSqm: listing.sizeSqm,
    amenities: listing.amenities || [],
    imageUrls: imageUrls(listing),
    availabilityStatus: listing.availabilityStatus,
  });

  listing.aiRecommendation = ai.recommendation;
  listing.aiConfidence = ai.confidence;
  listing.aiReasons = ai.reasons;
  listing.aiSummary = ai.summary;
  listing.requiresManualReview = ai.requiresManualReview;
  listing.aiReviewedAt = new Date();

  // Marketplace publishes stay pending until human admin — never auto-approve.
  if (listing.availabilityStatus === "available") {
    listing.verificationStatus = "pending";
    if (!listing.publishedAt) listing.publishedAt = new Date();
  }

  await listing.save();

  const escalate =
    ai.requiresManualReview ||
    ai.recommendation !== "approve" ||
    listing.verificationStatus === "pending";

  if (escalate) {
    const reviewers = await findListingReviewerUserIds();
    const flagged = ai.recommendation !== "approve" || ai.requiresManualReview;
    const subject = flagged
      ? `AI flagged listing · ${listing.title}`
      : `Listing awaiting admin verification · ${listing.title}`;
    const body = flagged
      ? `AI Property review is not satisfied with “${listing.title}” (${ai.recommendation}, ${Math.round(ai.confidence * 100)}% confidence). ${ai.summary} Please review in Admin → Listings.`
      : `“${listing.title}” passed AI screening but still needs admin verification before it can go live. ${ai.summary}`;

    await Promise.all(
      reviewers.map((r) =>
        notifyUser({
          userId: r.userId,
          type: flagged
            ? "listing.ai_escalated"
            : "listing.pending_admin",
          title: flagged
            ? "Listing escalated by AI"
            : "Listing pending verification",
          body,
          link: "/admin/listings",
          meta: {
            listingId: String(listing._id),
            aiRecommendation: ai.recommendation,
            trigger: input.trigger,
          },
          email: {
            to: r.email,
            subject,
          },
        }).catch(() => undefined)
      )
    );
  }

  // Notify landlord that review is in progress (not live yet).
  const owner = await User.findById(listing.ownerUserId).select("email").lean();
  await notifyUser({
    userId: String(listing.ownerUserId),
    type: "listing.ai_reviewed",
    title:
      listing.verificationStatus === "pending"
        ? "Property submitted for verification"
        : "Property details reviewed",
    body:
      listing.verificationStatus === "pending"
        ? `“${listing.title}” was reviewed by House In Hands AI and is awaiting admin approval. It is not live on the marketplace yet.`
        : `AI reviewed “${listing.title}”. ${
            ai.requiresManualReview
              ? "Admin has been notified about items to check."
              : "Looks complete for management use."
          }`,
    link: "/portal/listings",
    email: owner?.email
      ? {
          to: owner.email,
          subject:
            listing.verificationStatus === "pending"
              ? "Your property is pending verification"
              : "Your property was reviewed",
        }
      : undefined,
  }).catch(() => undefined);

  await writeAudit({
    action: "listing.ai_review",
    summary: `AI reviewed listing "${listing.title}" → ${ai.recommendation}`,
    actor: input.actor || undefined,
    entityType: "listing",
    entityId: String(listing._id),
    metadata: {
      recommendation: ai.recommendation,
      confidence: ai.confidence,
      requiresManualReview: ai.requiresManualReview,
      trigger: input.trigger,
      verificationStatus: listing.verificationStatus,
    },
  });

  return ai;
}
