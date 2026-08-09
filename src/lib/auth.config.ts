import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
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
        };
        token.id = u.id;
        token.email = u.email;
        token.name = u.name;
        token.isAdmin = u.isAdmin;
        token.theme = u.theme;
      }

      if (trigger === "update" && session) {
        if (session.theme === "light" || session.theme === "dark") {
          token.theme = session.theme;
        }
        if (typeof session.name === "string") token.name = session.name;
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: String(token.id || ""),
        email: String(token.email || ""),
        name: String(token.name || ""),
        isAdmin: Boolean(token.isAdmin),
        theme: token.theme === "dark" ? "dark" : "light",
      } as typeof session.user;
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
