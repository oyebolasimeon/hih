import { NextResponse } from "next/server";
import { mapVtpassCategory } from "@/lib/utility-catalog";
import {
  vtpassGetServiceCategories,
  vtpassGetServices,
  vtpassMockMode,
} from "@/lib/vtpass";
import { assertUser } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { response } = await assertUser();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const identifier = searchParams.get("identifier");

  try {
    if (identifier) {
      const services = await vtpassGetServices(identifier);
      const meta = mapVtpassCategory(identifier);
      return NextResponse.json({
        identifier,
        meta,
        services,
      });
    }

    const categories = await vtpassGetServiceCategories();
    const enriched = categories.map((c) => ({
      ...c,
      meta: mapVtpassCategory(c.identifier),
    }));

    return NextResponse.json({
      categories: enriched,
      integrationMode: vtpassMockMode() ? "mock" : "live",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not load VTpass catalog.",
      },
      { status: 502 }
    );
  }
}
