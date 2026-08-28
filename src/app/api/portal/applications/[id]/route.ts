import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import {
  notifyUser,
  requireActiveProfile,
  requireVerifiedProfile,
} from "@/lib/profile-context";
import { Application } from "@/models/Application";
import { Lease } from "@/models/Lease";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";
import { getPlatformFees, computeAgreementFee } from "@/lib/platform-fees";

const patchSchema = z.object({
  status: z.enum(["approved", "rejected", "under_review"]),
  landlordNotes: z.string().trim().max(2000).optional(),
});

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const gate = await requireActiveProfile(user.id, [
    "landlord",
    "estate_manager",
  ]);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const verified = requireVerifiedProfile(gate.profile);
  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.error },
      { status: verified.status }
    );
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid application." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid payload." },
      { status: 400 }
    );
  }

  await connectDB();
  const application = await Application.findById(id);
  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  const landlordProfile = await Profile.findOne({
    _id: application.landlordProfileId,
    userId: user.id,
  });
  if (!landlordProfile) {
    return NextResponse.json(
      { error: "Only the landlord can review this application." },
      { status: 403 }
    );
  }

  if (!["submitted", "under_review"].includes(application.status)) {
    return NextResponse.json(
      { error: "This application can no longer be reviewed." },
      { status: 409 }
    );
  }

  application.status = parsed.data.status;
  if (parsed.data.landlordNotes !== undefined) {
    application.landlordNotes = parsed.data.landlordNotes;
  }
  await application.save();

  const listing = await Listing.findById(application.listingId);
  let leaseId: string | null = null;

  if (parsed.data.status === "approved" && listing) {
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (listing.price.period === "yearly") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (listing.price.period === "term") {
      endDate.setMonth(endDate.getMonth() + 4);
    } else {
      endDate.setMonth(endDate.getMonth() + 12);
    }

    const fees = await getPlatformFees();
    const legalProvider = listing.legalSettings?.provider || "hih";
    const agreementFeePercent =
      listing.legalSettings?.agreementFeePercent ?? fees.agreementFeePercent;
    const agreementFeeAmount = computeAgreementFee(
      listing.price.amount,
      fees.agreementFeePercent,
      agreementFeePercent
    );

    const termsText = [
      `Tenancy agreement for ${listing.title}`,
      `Address: ${listing.address.street}, ${listing.address.city}, ${listing.address.state}`,
      `Rent: ${listing.price.currency} ${listing.price.amount.toLocaleString()} per ${listing.price.period}`,
      `Start: ${startDate.toISOString().slice(0, 10)}`,
      `End: ${endDate.toISOString().slice(0, 10)}`,
      "",
      legalProvider === "hih"
        ? "Legal handling: House In Hand will prepare and manage the tenancy documents."
        : `Legal handling: ${listing.legalSettings?.companyName || "Landlord-appointed legal firm"}.`,
      `Agreement fee (${agreementFeePercent}%): ${listing.price.currency} ${agreementFeeAmount.toLocaleString()} — payable by tenant before signing.`,
      "",
      "Both parties agree to the House In Hand platform terms and applicable Nigerian tenancy laws.",
      "Signatures below confirm acceptance of these terms.",
    ].join("\n");

    const lease = await Lease.create({
      listingId: listing._id,
      tenantProfileId: application.applicantProfileId,
      landlordProfileId: application.landlordProfileId,
      applicationId: application._id,
      status: "pending_signature",
      startDate,
      endDate,
      rentAmount: listing.price.amount,
      currency: listing.price.currency || "NGN",
      paymentPeriod: listing.price.period,
      termsText,
      legalProvider,
      legalCompanyName: listing.legalSettings?.companyName,
      agreementFeePercent,
      agreementFeeAmount,
    });
    leaseId = String(lease._id);

    listing.availabilityStatus = "pending";
    await listing.save();
  }

  const tenant = await User.findById(application.applicantUserId)
    .select("email name")
    .lean();
  if (tenant) {
    const approved = parsed.data.status === "approved";
    await notifyUser({
      userId: String(tenant._id),
      type: approved ? "application.approved" : "application.updated",
      title: approved ? "Application approved" : `Application ${parsed.data.status}`,
      body: approved
        ? `Your application for “${listing?.title || "a listing"}” was approved. Please review and sign the agreement.`
        : `Your application for “${listing?.title || "a listing"}” was marked ${parsed.data.status}.`,
      link: approved ? "/portal/agreements" : "/portal/applications",
      meta: {
        applicationId: String(application._id),
        leaseId,
        status: parsed.data.status,
      },
      email: tenant.email
        ? {
            to: tenant.email,
            subject: approved
              ? "Application approved — sign your lease"
              : `Application ${parsed.data.status}`,
          }
        : undefined,
    });
  }

  await writeAudit({
    action: `application.${parsed.data.status}`,
    summary: `Application ${parsed.data.status}${leaseId ? `; lease ${leaseId}` : ""}`,
    actor: actorFromUser(user),
    entityType: "application",
    entityId: String(application._id),
    metadata: { leaseId, landlordNotes: parsed.data.landlordNotes || "" },
    request: req,
  });

  return NextResponse.json({
    application: {
      id: String(application._id),
      status: application.status,
      landlordNotes: application.landlordNotes || "",
      leaseId,
    },
  });
}
