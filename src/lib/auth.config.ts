import type { NextAuthConfig } from "next-auth";
import type { AdminRole, Permission } from "@/lib/rbac";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isAdmin = !!(auth?.user as { isAdmin?: boolean } | undefined)?.isAdmin;

      const isAuthPage =
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password");

      const isPortal = pathname.startsWith("/portal");
      const isAdminRoute = pathname.startsWith("/admin");

      if ((isPortal || isAdminRoute) && !isLoggedIn) return false;
      if (isAdminRoute && isLoggedIn && !isAdmin) return false;
      if (isAuthPage && isLoggedIn) return true;
      return true;
    },
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
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: String(token.id || ""),
        email: String(token.email || ""),
        name: String(token.name || ""),
        isAdmin: Boolean(token.isAdmin),
        theme: token.theme === "light" ? "light" : "dark",
        role: (token.role as AdminRole | null) || null,
        permissions: (token.permissions as Permission[]) || [],
      } as typeof session.user;
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
