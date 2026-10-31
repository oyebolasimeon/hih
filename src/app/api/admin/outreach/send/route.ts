import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { getOutreachTemplate } from "@/lib/outreach-email-templates";
import {
  buildBrandedEmail,
  resolveEmailBaseVars,
} from "@/lib/email-layout";
import {
  htmlToPlainText,
  renderTemplateString,
} from "@/lib/email-templates";
import { sendMail } from "@/lib/smtp";

const recipientSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(200).optional(),
  userId: z.string().min(1).optional(),
});

const bodySchema = z.object({
  templateId: z.enum([
    "services_offers",
    "talent_recruit",
    "investor_pitch",
  ]),
  subject: z.string().trim().min(2).max(300).optional(),
  html: z.string().trim().min(10).max(100_000).optional(),
  recipients: z.array(recipientSchema).min(1).max(50),
});

export async function POST(req: Request) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const template = getOutreachTemplate(parsed.data.templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const subjectTemplate = parsed.data.subject || template.subject;
  const htmlTemplate = parsed.data.html || template.html;

  await connectDB();

  const results: Array<{ email: string; ok: boolean; error?: string }> = [];

  for (const recipient of parsed.data.recipients) {
    let name = (recipient.name || "").trim();
    let email = recipient.email.trim().toLowerCase();

    if (recipient.userId) {
      const dbUser = await User.findById(recipient.userId)
        .select("name email")
        .lean();
      if (!dbUser?.email) {
        results.push({
          email: recipient.email,
          ok: false,
          error: "User not found",
        });
        continue;
      }
      email = dbUser.email;
      if (!name) name = dbUser.name || "";
    }

    try {
      const base = await resolveEmailBaseVars({
        name: name || email,
        email,
      });
      const appUrl = String(base.appUrl || "");
      const vars = {
        ...base,
        name: name || email,
        email,
        pricingUrl: `${appUrl}/pricing`,
        aboutUrl: `${appUrl}/about`,
      };

      const subject = renderTemplateString(subjectTemplate, vars);
      const inner = renderTemplateString(htmlTemplate, vars);
      const html = await buildBrandedEmail(inner, vars);

      await sendMail({
        to: email,
        subject,
        html,
        text: htmlToPlainText(html),
      });
      results.push({ email, ok: true });
    } catch (err) {
      console.error("Outreach email failed:", email, err);
      results.push({
        email,
        ok: false,
        error: err instanceof Error ? err.message : "Send failed",
      });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  await writeAudit({
    actor: actorFromUser(user),
    action: "outreach_email.send",
    summary: `Sent outreach “${template.label}” to ${sent} recipient(s)${
      failed ? `, ${failed} failed` : ""
    }`,
    entityType: "OutreachEmail",
    entityId: template.id,
    investorVisible: false,
    metadata: {
      templateId: template.id,
      sent,
      failed,
      recipients: results.map((r) => r.email),
    },
    request: req,
  });

  return NextResponse.json({
    ok: failed === 0,
    sent,
    failed,
    results,
  });
}
