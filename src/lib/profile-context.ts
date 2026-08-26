import { connectDB } from "@/lib/db";
import { Profile, type IProfile, type ProfileType } from "@/models/Profile";
import { User } from "@/models/User";
import { Notification } from "@/models/Notification";
import { sendMail } from "@/lib/mail";

export async function getActiveProfile(userId: string) {
  await connectDB();
  const user = await User.findById(userId).select("activeProfileId name email").lean();
  if (!user?.activeProfileId) {
    const fallback = await Profile.findOne({ userId }).sort({ createdAt: 1 });
    return { user, profile: fallback };
  }
  const profile = await Profile.findOne({
    _id: user.activeProfileId,
    userId,
  });
  return { user, profile };
}

export async function requireActiveProfile(
  userId: string,
  allowed?: ProfileType[]
): Promise<
  | { ok: true; profile: IProfile; user: { name?: string; email?: string } }
  | { ok: false; error: string; status: number }
> {
  const { user, profile } = await getActiveProfile(userId);
  if (!profile) {
    return {
      ok: false,
      error: "Create and select a profile first.",
      status: 400,
    };
  }
  if (profile.status === "suspended") {
    return {
      ok: false,
      error: "This profile is suspended. Contact support or switch profiles.",
      status: 403,
    };
  }
  if (allowed && !allowed.includes(profile.type)) {
    return {
      ok: false,
      error: `Active profile must be: ${allowed.join(", ")}`,
      status: 403,
    };
  }
  return {
    ok: true,
    profile: profile as IProfile,
    user: { name: user?.name, email: user?.email },
  };
}

export function requireVerifiedProfile(profile: IProfile) {
  if (profile.status !== "verified") {
    return {
      ok: false as const,
      error: "Complete KYC verification before continuing.",
      status: 403,
    };
  }
  return { ok: true as const };
}

export async function notifyUser(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  meta?: Record<string, unknown>;
  email?: { to: string; subject?: string };
}) {
  await connectDB();
  await Notification.create({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    meta: input.meta,
    read: false,
  });

  if (input.email?.to) {
    try {
      await sendMail({
        to: input.email.to,
        subject: input.email.subject || input.title,
        text: input.body + (input.link ? `\n\n${process.env.AUTH_URL || ""}${input.link}` : ""),
        html: `<p>${input.body}</p>${
          input.link
            ? `<p><a href="${(process.env.AUTH_URL || "").replace(/\/$/, "")}${input.link}">Open in House In Hand</a></p>`
            : ""
        }`,
      });
    } catch (err) {
      console.error("notify email failed:", err);
    }
  }
}
