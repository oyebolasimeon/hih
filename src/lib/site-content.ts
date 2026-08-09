import { connectDB } from "@/lib/db";
import {
  AUTH_BACKGROUND_KEY,
  INVESTOR_LOGIN_MODAL_KEY,
  SiteContent,
  type ISiteContent,
} from "@/models/SiteContent";

export const DEFAULT_AUTH_BACKGROUND = {
  imageUrl: "/hero-london.png",
  imagePublicId: "",
} as const;

export type AuthBackgroundContent = {
  imageUrl: string;
  imagePublicId: string;
};

export const DEFAULT_INVESTOR_MODAL = {
  title: "Your Investor Portal",
  ctaLabel: "Continue to Login",
  body: `Welcome to Nova Elite Homes.

As a Nova investor, you unlock a private command centre for capital placed with us — you never list or create properties yourself.

How you hold assets with Nova:

• Outright — Nova assigns a property into your portfolio after purchase / onboarding
• Open investments — browse Opportunities, review ROI terms, and express interest on Nova-listed assets

Even when you buy outright, Nova can manage the property for you: long-term lease, short let, or Airbnb-style stays. We handle guests, operations, and return reporting — you see results in your portal.

Inside the portal you can:

• See invested capital, portfolio value, and returns at a glance
• Browse properties Nova has assigned to you (photos, status, valuations)
• Track Nova-managed stays, channels (Airbnb, Booking.com, direct), and revenue
• Review monthly analytics: revenue, commission, occupancy, and channel mix
• Explore open investment opportunities Nova is raising for
• Switch light or dark mode for comfortable late-evening reviews

What we manage for you:

• Letting & hospitality operations on your behalf
• Guest experience, compliance, and day-to-day property care
• Clear reporting so you always know how your capital is performing

Continue to sign in or create your investor account. Your data is private to you — only your portfolio, never someone else's.`,
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

export function serializeAuthBackground(
  doc?: ISiteContent | null
): AuthBackgroundContent {
  const url = (doc?.imageUrl || "").trim();
  return {
    imageUrl: url || DEFAULT_AUTH_BACKGROUND.imageUrl,
    imagePublicId: doc?.imagePublicId || "",
  };
}

export async function getAuthBackgroundContent(): Promise<AuthBackgroundContent> {
  await connectDB();
  const doc = await SiteContent.findOne({ key: AUTH_BACKGROUND_KEY }).lean();
  return serializeAuthBackground(doc as ISiteContent | null);
}

export async function upsertAuthBackgroundContent(
  data: Partial<AuthBackgroundContent>,
  updatedBy?: string
): Promise<AuthBackgroundContent> {
  await connectDB();
  const existing = await SiteContent.findOne({ key: AUTH_BACKGROUND_KEY });

  const next = {
    title: existing?.title || "Auth page background",
    body:
      existing?.body ||
      "Background image for sign-in and related auth pages.",
    ctaLabel: existing?.ctaLabel || "Auth",
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
    { key: AUTH_BACKGROUND_KEY },
    {
      $set: {
        ...next,
        ...(updatedBy ? { updatedBy } : {}),
      },
      $setOnInsert: { key: AUTH_BACKGROUND_KEY },
    },
    { upsert: true, new: true }
  );

  return serializeAuthBackground(doc);
}
