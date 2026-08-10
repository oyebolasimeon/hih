import { connectDB } from "@/lib/db";
import {
  AUTH_BACKGROUND_KEY,
  INVESTOR_LOGIN_MODAL_KEY,
  SiteContent,
  type ISiteContent,
} from "@/models/SiteContent";

export const DEFAULT_AUTH_BACKGROUND = {
  imageUrl: "/hero-home.jpg",
  imagePublicId: "",
} as const;

export type AuthBackgroundContent = {
  imageUrl: string;
  imagePublicId: string;
};

export const DEFAULT_INVESTOR_MODAL = {
  title: "Welcome to House In Hand",
  ctaLabel: "Continue to sign in",
  body: `House In Hand is the housing platform for Nigeria.

Create a Tenant, Student, Landlord, or Estate Manager profile, complete KYC, then search listings or publish properties — with digital agreements and rent tools in one place.

Continue to sign in or create your account.`,
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
  try {
    await connectDB();
    const doc = await SiteContent.findOne({ key: AUTH_BACKGROUND_KEY }).lean();
    return serializeAuthBackground(doc as ISiteContent | null);
  } catch (err) {
    console.error("Auth background fetch failed:", err);
    return { ...DEFAULT_AUTH_BACKGROUND };
  }
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
