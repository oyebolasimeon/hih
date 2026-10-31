import webpush from "web-push";
import { connectDB } from "@/lib/db";
import { PushSubscription } from "@/models/PushSubscription";
import { getSiteUrl } from "@/lib/seo/site";

function vapidConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

let configured = false;

function ensureVapid() {
  if (configured) return vapidConfigured();
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  const subject =
    process.env.VAPID_SUBJECT || "mailto:houseinhandsmail@gmail.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
}

export async function sendWebPushToUser(input: {
  userId: string;
  title: string;
  body: string;
  link?: string;
  tag?: string;
}) {
  if (!ensureVapid()) return { sent: 0, skipped: true as const };

  await connectDB();
  const subs = await PushSubscription.find({ userId: input.userId }).lean();
  if (subs.length === 0) return { sent: 0, skipped: false as const };

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.link || "/portal/messages",
    tag: input.tag || "hih-message",
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        },
        payload,
        { TTL: 60 * 60 }
      );
      sent += 1;
    } catch (err: unknown) {
      const status =
        err && typeof err === "object" && "statusCode" in err
          ? Number((err as { statusCode?: number }).statusCode)
          : 0;
      if (status === 404 || status === 410) {
        await PushSubscription.deleteOne({ _id: sub._id });
      } else {
        console.warn("web push failed:", err);
      }
    }
  }

  return { sent, skipped: false as const, origin: getSiteUrl() };
}
