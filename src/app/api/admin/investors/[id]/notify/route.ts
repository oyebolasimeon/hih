import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/api-auth";
import { Investor } from "@/models/Investor";
import { User } from "@/models/User";
import { sendPortfolioUpdateEmail } from "@/lib/mail";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await assertAdmin("investors:write");
  if (response) return response;

  const { id } = await context.params;
  const investor = await Investor.findById(id).lean();
  if (!investor) {
    return NextResponse.json({ error: "Investor not found." }, { status: 404 });
  }

  const user = await User.findById(id).lean();
  const result = await sendPortfolioUpdateEmail({
    to: investor.email,
    name: investor.name,
    emailNotifications: user?.emailNotifications,
  });

  if (result.skipped) {
    return NextResponse.json({
      success: true,
      skipped: true,
      message: "Investor has email notifications turned off.",
    });
  }

  return NextResponse.json({
    success: true,
    skipped: false,
    message: "Portfolio update email sent.",
  });
}
