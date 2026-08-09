import { NextResponse } from "next/server";
import { getInvestorLoginModalContent } from "@/lib/site-content";

export async function GET() {
  const content = await getInvestorLoginModalContent();
  return NextResponse.json({
    title: content.title,
    body: content.body,
    ctaLabel: content.ctaLabel,
    imageUrl: content.imageUrl,
  });
}
