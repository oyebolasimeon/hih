import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { generateAgreementPdf } from "@/lib/receipt-pdf";
import { Lease } from "@/models/Lease";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid agreement." }, { status: 400 });
  }

  await connectDB();
  const lease = await Lease.findById(id);
  if (!lease) {
    return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
  }

  const profiles = await Profile.find({ userId: user.id }).select("_id").lean();
  const profileIds = new Set(profiles.map((p) => String(p._id)));
  const allowed =
    profileIds.has(String(lease.tenantProfileId)) ||
    profileIds.has(String(lease.landlordProfileId));
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const listing = await Listing.findById(lease.listingId).select("title").lean();
  const pdf = await generateAgreementPdf({
    title: listing?.title || "Tenancy agreement",
    documentNumber: lease.documentNumber || `AGR-${String(lease._id).slice(-6).toUpperCase()}`,
    termsText: lease.termsText || "",
    rentAmount: lease.rentAmount,
    currency: lease.currency,
    paymentPeriod: lease.paymentPeriod,
    startDate: lease.startDate,
    endDate: lease.endDate,
    legalProvider: lease.legalProvider,
    legalCompanyName: lease.legalCompanyName,
    tenantSignatureName: lease.tenantSignatureName,
    landlordSignatureName: lease.landlordSignatureName,
    tenantSignedAt: lease.tenantSignedAt,
    landlordSignedAt: lease.landlordSignedAt,
  });

  const filename = `${lease.documentNumber || "agreement"}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
