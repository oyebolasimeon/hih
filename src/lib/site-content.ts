import { connectDB } from "@/lib/db";
import {
  INVESTOR_LOGIN_MODAL_KEY,
  SiteContent,
  type ISiteContent,
} from "@/models/SiteContent";

export const DEFAULT_INVESTOR_MODAL = {
  title: "Your Investor Portal",
  ctaLabel: "Continue to Login",
  body: `Welcome to Nova Elite Homes.

As a Nova investor, you unlock a private command centre built around your London portfolio — not a generic dashboard.

Inside the portal you can:

• See your total invested capital, portfolio value, and returns at a glance
• Browse every property you own with photos, status, and live valuations
• Track confirmed bookings across channels — Airbnb, Booking.com, and direct stays
• Review monthly analytics: revenue, commission, occupancy, and channel mix
• Plan ahead with a calendar of arrivals, departures, and open nights
• Switch light or dark mode so late-evening reviews stay comfortable

What we manage for you:

• Hands-on short-let operations across carefully selected London assets
• Guest experience, compliance, and day-to-day property care
• Clear reporting so you always know how your capital is performing
• A trusted partnership — we operate; you stay informed and in control

When you are ready, continue to sign in or create your investor account. Your data is private to you — only your portfolio, never someone else's.`,
  imageUrl: "",
  imagePublicId: "",
} as const;

export type InvestorModalContent = {
  title: string;
  body: string;
  ctaLabel: string;
  imageUrl: string;
  imagePublicId: string;
};

export function serializeInvestorModal(
  doc?: ISiteContent | null
): InvestorModalContent {
  return {
    title: doc?.title || DEFAULT_INVESTOR_MODAL.title,
    body: doc?.body || DEFAULT_INVESTOR_MODAL.body,
    ctaLabel: doc?.ctaLabel || DEFAULT_INVESTOR_MODAL.ctaLabel,
    imageUrl: doc?.imageUrl || "",
    imagePublicId: doc?.imagePublicId || "",
  };
}

export async function getInvestorLoginModalContent(): Promise<InvestorModalContent> {
  await connectDB();
  const doc = await SiteContent.findOne({ key: INVESTOR_LOGIN_MODAL_KEY }).lean();
  return serializeInvestorModal(doc as ISiteContent | null);
}

export async function upsertInvestorLoginModalContent(
  data: Partial<InvestorModalContent>,
  updatedBy?: string
): Promise<InvestorModalContent> {
  await connectDB();
  const existing = await SiteContent.findOne({ key: INVESTOR_LOGIN_MODAL_KEY });

  const next = {
    title: data.title ?? existing?.title ?? DEFAULT_INVESTOR_MODAL.title,
    body: data.body ?? existing?.body ?? DEFAULT_INVESTOR_MODAL.body,
    ctaLabel:
      data.ctaLabel ?? existing?.ctaLabel ?? DEFAULT_INVESTOR_MODAL.ctaLabel,
    imageUrl:
      data.imageUrl !== undefined
        ? data.imageUrl
        : existing?.imageUrl || "",
    imagePublicId:
      data.imagePublicId !== undefined
        ? data.imagePublicId
        : existing?.imagePublicId || "",
  };

  const doc = await SiteContent.findOneAndUpdate(
    { key: INVESTOR_LOGIN_MODAL_KEY },
    {
      $set: {
        ...next,
        ...(updatedBy ? { updatedBy } : {}),
      },
      $setOnInsert: { key: INVESTOR_LOGIN_MODAL_KEY },
    },
    { upsert: true, new: true }
  );

  return serializeInvestorModal(doc);
}
