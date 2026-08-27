import { NextResponse } from "next/server";
import { vtpassMockMode } from "@/lib/vtpass";
import { assertUser } from "@/lib/api-auth";

/** @deprecated Use /api/portal/utilities/catalog */
export async function GET() {
  const { response } = await assertUser();
  if (response) return response;

  return NextResponse.json({
    redirect: "/api/portal/utilities/catalog",
    integrationMode: vtpassMockMode() ? "mock" : "live",
  });
}
