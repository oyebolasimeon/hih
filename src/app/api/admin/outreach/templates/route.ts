import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/api-auth";
import { OUTREACH_TEMPLATES } from "@/lib/outreach-email-templates";
import { EMAIL_VARIABLES } from "@/lib/email-templates";

export async function GET() {
  const { response } = await assertAdmin("content:read");
  if (response) return response;

  return NextResponse.json({
    templates: OUTREACH_TEMPLATES,
    variables: [
      ...EMAIL_VARIABLES.filter((v) =>
        ["{{name}}", "{{email}}", "{{appUrl}}", "{{portalUrl}}", "{{loginUrl}}", "{{year}}"].includes(
          v.key
        )
      ),
      { key: "{{pricingUrl}}", label: "Pricing page URL" },
      { key: "{{aboutUrl}}", label: "About page URL" },
    ],
  });
}
