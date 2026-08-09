import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { resolveAdminAccess } from "@/lib/admin";
import { authConfig } from "@/lib/auth.config";
import type { AdminRole, Permission } from "@/lib/rbac";

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
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password || "");

        if (!email || !password) return null;

        await connectDB();
        const user = await User.findOne({ email });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

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
