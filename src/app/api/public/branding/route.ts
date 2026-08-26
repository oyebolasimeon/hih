import { NextResponse } from "next/server";
import { getBranding } from "@/lib/branding";

/** Public branding for theme application (no auth). */
export async function GET() {
  const branding = await getBranding();
  return NextResponse.json(
    { branding },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}
