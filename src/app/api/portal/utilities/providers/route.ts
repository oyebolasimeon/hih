import { NextResponse } from "next/server";
import { UTILITY_CATEGORIES, UTILITY_PROVIDERS } from "@/lib/utility-providers";
import { vtpassMockMode } from "@/lib/vtpass";
import { assertUser } from "@/lib/api-auth";

export async function GET() {
  const { response } = await assertUser();
  if (response) return response;

  return NextResponse.json({
    categories: UTILITY_CATEGORIES,
    providers: UTILITY_PROVIDERS,
    integrationMode: vtpassMockMode() ? "mock" : "live",
  });
}
