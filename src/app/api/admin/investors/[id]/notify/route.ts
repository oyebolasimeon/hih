import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/api-auth";
import { Investor } from "@/models/Investor";
import { User } from "@/models/User";
import { sendPortfolioUpdateEmail } from "@/lib/mail";
import { actorFromUser, writeAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("investors:write");
  if (response || !user) return response!;

  const { id } = await context.params;
  const investor = await Investor.findById(id).lean();
  if (!investor) {
    return NextResponse.json({ error: "Investor not found." }, { status: 404 });
  }

  const account = await User.findById(id).lean();
  const result = await sendPortfolioUpdateEmail({
    to: investor.email,
    name: investor.name,
    emailNotifications: account?.emailNotifications,
  });

  if (result.skipped) {
    await writeAudit({
      action: "investor.notify",
      summary: `Skipped portfolio update email to ${investor.name} (notifications off)`,
      actor: actorFromUser(user),
      entityType: "Investor",
      entityId: String(investor._id),
      investorId: String(investor._id),
      investorVisible: true,
      metadata: { skipped: true },
      request,
    });
    return NextResponse.json({
      success: true,
      skipped: true,
      message: "Investor has email notifications turned off.",
    });
  }

  await writeAudit({
    action: "investor.notify",
    summary: `Sent portfolio update email to ${investor.name}`,
    actor: actorFromUser(user),
    entityType: "Investor",
    entityId: String(investor._id),
    investorId: String(investor._id),
    investorVisible: true,
    metadata: { skipped: false, to: investor.email },
    request,
  });

  return NextResponse.json({
    success: true,
    skipped: false,
    message: "Portfolio update email sent.",
  });
}
