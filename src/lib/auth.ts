import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { CredentialsSignin } from "next-auth";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Investor } from "@/models/Investor";
import { resolveAdminAccess } from "@/lib/admin";
import { authConfig } from "@/lib/auth.config";
import { actorFromUser, sanitizeAuditValue, writeAudit } from "@/lib/audit";
import { sendWelcomeEmail } from "@/lib/mail";
import { redisDel, redisGet } from "@/lib/redis";
import type { AdminRole, Permission } from "@/lib/rbac";

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      isAdmin: boolean;
      theme: "light" | "dark";
      role: AdminRole | null;
      permissions: Permission[];
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
    theme: "light" | "dark";
    role: AdminRole | null;
    permissions: Permission[];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    name?: string;
    isAdmin?: boolean;
    theme?: "light" | "dark";
    role?: AdminRole | null;
    permissions?: Permission[];
    permissionsCheckedAt?: number;
  }
}

const PERMISSION_REFRESH_MS = 60_000;

const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        autoLoginToken: { label: "Auto login token", type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password || "");
        const autoLoginToken = String(credentials?.autoLoginToken || "").trim();

        await connectDB();

        if (autoLoginToken) {
          const userId = await redisGet(`autologin:${autoLoginToken}`);
          if (!userId) return null;
          const user = await User.findById(userId);
          await redisDel(`autologin:${autoLoginToken}`);
          if (!user || user.emailVerified === false) return null;

          const access = await resolveAdminAccess(String(user._id), user.email);
          return {
            id: String(user._id),
            email: user.email,
            name: user.name,
            isAdmin: access.isAdmin,
            theme: user.theme,
            role: access.role,
            permissions: access.permissions,
          };
        }

        if (!email || !password) return null;

        const user = await User.findOne({ email });
        if (!user) {
          await writeAudit({
            action: "auth.login_failed",
            summary: `Failed login attempt for ${email}`,
            actor: { email, kind: "anonymous" },
            entityType: "User",
            metadata: { reason: "user_not_found" },
          });
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await writeAudit({
            action: "auth.login_failed",
            summary: `Failed login attempt for ${email}`,
            actor: { email, kind: "anonymous" },
            entityType: "User",
            entityId: String(user._id),
            metadata: { reason: "invalid_password" },
          });
          return null;
        }

        if (user.emailVerified === false) {
          await writeAudit({
            action: "auth.login_failed",
            summary: `Login blocked — email not verified (${email})`,
            actor: { email, kind: "anonymous" },
            entityType: "User",
            entityId: String(user._id),
            metadata: { reason: "email_not_verified" },
          });
          throw new EmailNotVerifiedError();
        }

        const access = await resolveAdminAccess(String(user._id), user.email);

        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          isAdmin: access.isAdmin,
          theme: user.theme,
          role: access.role,
          permissions: access.permissions,
        };
      },
    }),
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const email = String(user.email || "")
        .trim()
        .toLowerCase();
      if (!email) return "/login?error=google_email";

      await connectDB();
      const googleId = String(
        (profile as { sub?: string } | undefined)?.sub || ""
      );
      let dbUser = await User.findOne({ email });
      let created = false;

      if (!dbUser) {
        const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
        dbUser = await User.create({
          name: user.name || email.split("@")[0],
          email,
          passwordHash,
          googleId,
          phone: "",
          emailNotifications: true,
          emailVerified: true,
          theme: "dark",
        });
        await Investor.create({
          _id: dbUser._id,
          name: dbUser.name,
          email,
          totalInvested: 0,
          totalReturns: 0,
          portfolioValue: 0,
        });
        created = true;

        try {
          await sendWelcomeEmail(email, dbUser.name);
        } catch (err) {
          console.error("Welcome email after Google signup failed:", err);
        }

        await writeAudit({
          action: "auth.google_register",
          summary: `Registered via Google ${email}`,
          actor: {
            id: String(dbUser._id),
            email,
            name: dbUser.name,
            kind: "investor",
          },
          entityType: "User",
          entityId: String(dbUser._id),
          investorId: String(dbUser._id),
          investorVisible: true,
          changes: [
            {
              field: "account",
              oldValue: null,
              newValue: sanitizeAuditValue({
                name: dbUser.name,
                email,
                googleId: Boolean(googleId),
                emailVerified: true,
              }),
            },
          ],
        });
      } else {
        let dirty = false;
        if (dbUser.emailVerified === false) {
          dbUser.emailVerified = true;
          dirty = true;
        }
        if (googleId && dbUser.googleId !== googleId) {
          dbUser.googleId = googleId;
          dirty = true;
        }
        if (user.name && dbUser.name !== user.name && !dbUser.name.trim()) {
          dbUser.name = user.name;
          dirty = true;
        }
        if (dirty) await dbUser.save();
      }

      user.id = String(dbUser._id);
      user.name = dbUser.name;
      user.email = dbUser.email;
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        await connectDB();
        const dbUser =
          (user.id ? await User.findById(user.id) : null) ||
          (user.email
            ? await User.findOne({ email: String(user.email).toLowerCase() })
            : null);

        if (dbUser) {
          const access = await resolveAdminAccess(
            String(dbUser._id),
            dbUser.email
          );
          token.id = String(dbUser._id);
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.isAdmin = access.isAdmin;
          token.theme = dbUser.theme;
          token.role = access.role;
          token.permissions = access.permissions;
          token.permissionsCheckedAt = Date.now();
        } else {
          const u = user as {
            id: string;
            email: string;
            name: string;
            isAdmin?: boolean;
            theme?: "light" | "dark";
            role?: AdminRole | null;
            permissions?: Permission[];
          };
          token.id = u.id;
          token.email = u.email;
          token.name = u.name;
          token.isAdmin = Boolean(u.isAdmin);
          token.theme = u.theme === "light" ? "light" : "dark";
          token.role = u.role ?? null;
          token.permissions = u.permissions ?? [];
          token.permissionsCheckedAt = Date.now();
        }
      }

      if (trigger === "update" && session) {
        if (session.theme === "light" || session.theme === "dark") {
          token.theme = session.theme;
        }
        if (typeof session.name === "string") token.name = session.name;
        if (typeof session.isAdmin === "boolean") token.isAdmin = session.isAdmin;
        if ("role" in session) token.role = session.role;
        if (Array.isArray(session.permissions)) {
          token.permissions = session.permissions;
        }
        if (session.refreshPermissions) {
          token.permissionsCheckedAt = 0;
        }
      }

      const due =
        !token.permissionsCheckedAt ||
        Date.now() - token.permissionsCheckedAt > PERMISSION_REFRESH_MS;

      if (due && token.id && token.email) {
        try {
          const access = await resolveAdminAccess(
            String(token.id),
            String(token.email)
          );
          token.isAdmin = access.isAdmin;
          token.role = access.role;
          token.permissions = access.permissions;
          token.permissionsCheckedAt = Date.now();
        } catch {
          // Keep existing claims if refresh fails
        }
      }

      return token;
    },
  },
  events: {
    async signIn({ user, account }) {
      const u = user as {
        id?: string;
        email?: string | null;
        name?: string | null;
        isAdmin?: boolean;
      };
      if (!u?.id) return;
      // Google registration audit is written in signIn callback; avoid duplicate noise?
      // Still log successful login for Google and credentials.
      if (account?.provider === "google") {
        await connectDB();
        const access = await resolveAdminAccess(
          u.id,
          String(u.email || "")
        ).catch(() => ({ isAdmin: false as boolean }));
        await writeAudit({
          action: "auth.login",
          summary: `Signed in with Google ${u.email || u.id}`,
          actor: actorFromUser({
            id: u.id,
            email: u.email,
            name: u.name,
            isAdmin: access.isAdmin,
          }),
          entityType: "User",
          entityId: u.id,
          investorId: access.isAdmin ? null : u.id,
          investorVisible: !access.isAdmin,
          metadata: { provider: "google" },
        });
        return;
      }

      await writeAudit({
        action: "auth.login",
        summary: `Signed in ${u.email || u.id}`,
        actor: actorFromUser(u),
        entityType: "User",
        entityId: u.id,
        investorId: u.isAdmin ? null : u.id,
        investorVisible: !u.isAdmin,
      });
    },
    async signOut(message) {
      const token =
        "token" in message
          ? (message.token as {
              id?: string;
              email?: string;
              name?: string;
              isAdmin?: boolean;
            })
          : null;
      if (!token?.id) return;
      await writeAudit({
        action: "auth.logout",
        summary: `Signed out ${token.email || token.id}`,
        actor: actorFromUser({
          id: String(token.id),
          email: token.email,
          name: token.name,
          isAdmin: Boolean(token.isAdmin),
        }),
        entityType: "User",
        entityId: String(token.id),
        investorId: token.isAdmin ? null : String(token.id),
        investorVisible: !token.isAdmin,
      });
    },
  },
  secret: process.env.AUTH_SECRET,
});
