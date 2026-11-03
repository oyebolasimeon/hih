import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { sendMail } from "@/lib/smtp";
import { WaitlistSignup } from "@/models/WaitlistSignup";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  email: z.string().trim().email().max(200),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(30)
    .regex(/^[+\d][\d\s()-]*$/, "Enter a valid phone number."),
  name: z.string().trim().max(120).optional(),
  interest: z.enum(["tenant", "landlord", "both", "other"]).optional(),
  website: z.string().optional(), // honeypot
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid details." },
      { status: 400 }
    );
  }

  // Honeypot
  if (parsed.data.website?.trim()) {
    return NextResponse.json({ ok: true });
  }

  const email = parsed.data.email.toLowerCase();
  const phone = parsed.data.phone.replace(/\s+/g, " ").trim();

  await connectDB();

  const existing = await WaitlistSignup.findOne({ email }).lean();
  if (existing) {
    // Refresh phone if they re-submit; still treat as success
    await WaitlistSignup.updateOne(
      { email },
      {
        $set: {
          phone,
          ...(parsed.data.name ? { name: parsed.data.name } : {}),
          ...(parsed.data.interest ? { interest: parsed.data.interest } : {}),
        },
      }
    );
    return NextResponse.json({
      ok: true,
      alreadyJoined: true,
      message: "You're already on the waitlist. We'll notify you at launch.",
    });
  }

  const signup = await WaitlistSignup.create({
    email,
    phone,
    name: parsed.data.name || undefined,
    interest: parsed.data.interest || "both",
    source: "waitlist",
  });

  const appUrl = (process.env.AUTH_URL || "https://www.houseinhands.com").replace(
    /\/$/,
    ""
  );

  // Confirmation to the signup
  await sendMail({
    to: email,
    subject: "You're on the House In Hands waitlist",
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#0B1F3A;">
        <p style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#008585;margin:0 0 12px;">House In Hands</p>
        <h1 style="font-size:24px;margin:0 0 12px;">You're on the list</h1>
        <p style="line-height:1.6;color:#5A6A7D;">
          Thanks${parsed.data.name ? `, ${parsed.data.name}` : ""} for joining the House In Hands waitlist.
          We'll email <strong>${email}</strong> and reach you on <strong>${phone}</strong> when we officially launch.
        </p>
        <p style="line-height:1.6;color:#5A6A7D;">
          Property. In Your Hands.
        </p>
        <p style="margin-top:24px;">
          <a href="${appUrl}" style="display:inline-block;background:#008585;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600;">Visit House In Hands</a>
        </p>
      </div>
    `,
    text: `You're on the House In Hands waitlist. We'll notify ${email} / ${phone} at launch.`,
  }).catch(() => undefined);

  // Ops notification (best-effort)
  const opsTo =
    process.env.WAITLIST_NOTIFY_EMAIL ||
    process.env.CONTACT_TO ||
    "houseinhandsmail@gmail.com";
  await sendMail({
    to: opsTo,
    subject: `New waitlist signup · ${email}`,
    html: `<p>New waitlist signup</p><ul><li>Email: ${email}</li><li>Phone: ${phone}</li><li>Name: ${parsed.data.name || "—"}</li><li>Interest: ${parsed.data.interest || "both"}</li></ul>`,
    text: `Waitlist: ${email} / ${phone}`,
  }).catch(() => undefined);

  await writeAudit({
    action: "waitlist.join",
    summary: `Waitlist signup ${email}`,
    entityType: "waitlist",
    entityId: String(signup._id),
    metadata: { phone, interest: parsed.data.interest || "both" },
    request: req,
  });

  return NextResponse.json({
    ok: true,
    message: "You're on the waitlist. We'll notify you when we launch.",
  });
}
