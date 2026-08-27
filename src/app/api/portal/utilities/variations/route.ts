import { NextResponse } from "next/server";
import { vtpassGetVariations, vtpassMockMode } from "@/lib/vtpass";
import { assertUser } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { response } = await assertUser();
  if (response) return response;

  const serviceID = new URL(req.url).searchParams.get("serviceID");
  if (!serviceID) {
    return NextResponse.json({ error: "serviceID is required." }, { status: 400 });
  }

  try {
    const data = await vtpassGetVariations(serviceID);
    return NextResponse.json({
      serviceID,
      ...data,
      integrationMode: vtpassMockMode() ? "mock" : "live",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not load plan options.",
      },
      { status: 502 }
    );
  }
}
