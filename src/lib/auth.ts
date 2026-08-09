import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { resolveAdminAccess } from "@/lib/admin";
import { authConfig } from "@/lib/auth.config";
import { actorFromUser, writeAudit } from "@/lib/audit";
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
  ],
  events: {
    async signIn({ user }) {
      const u = user as {
        id?: string;
        email?: string | null;
        name?: string | null;
        isAdmin?: boolean;
      };
      if (!u?.id) return;
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
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as {
          id: string;
          email: string;
          name: string;
          isAdmin: boolean;
          theme: "light" | "dark";
          role?: AdminRole | null;
          permissions?: Permission[];
        };
        token.id = u.id;
        token.email = u.email;
        token.name = u.name;
        token.isAdmin = u.isAdmin;
        token.theme = u.theme;
        token.role = u.role ?? null;
        token.permissions = u.permissions ?? [];
        token.permissionsCheckedAt = Date.now();
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
  secret: process.env.AUTH_SECRET,
});
