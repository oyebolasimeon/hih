import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { generateExitNoticePdf } from "@/lib/receipt-pdf";
import { ExitNotice } from "@/models/ExitNotice";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid notice." }, { status: 400 });
  }

  await connectDB();
  const notice = await ExitNotice.findById(id);
  if (!notice) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const profiles = await Profile.find({ userId: user.id }).select("_id").lean();
  const ids = new Set(profiles.map((p) => String(p._id)));
  const isTenant = ids.has(String(notice.tenantProfileId));
  const isLandlord = ids.has(String(notice.landlordProfileId));
  if (!isTenant && !isLandlord) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (
    isTenant &&
    !isLandlord &&
    !["served", "acknowledged", "completed"].includes(notice.status)
  ) {
    return NextResponse.json(
      { error: "Document available after the notice is served." },
      { status: 403 }
    );
  }

  const listing = await Listing.findById(notice.listingId).select("title").lean();
  const pdf = await generateExitNoticePdf({
    title: listing?.title || "Exit notice",
    documentNumber:
      notice.documentNumber || `EXIT-${String(notice._id).slice(-6).toUpperCase()}`,
    termsText: notice.termsText || "",
    proposedVacateDate: notice.proposedVacateDate,
    noticeType: notice.noticeType,
    legalProvider: notice.legalProvider || "hih",
    legalCompanyName: notice.legalCompanyName,
    reviewedAt: notice.reviewedAt,
    servedAt: notice.servedAt,
  });

  const filename = `${notice.documentNumber || "exit-notice"}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
