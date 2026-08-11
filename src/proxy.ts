import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAdmin = !!req.auth?.user?.isAdmin;

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify-email");

  const isPortal = pathname.startsWith("/portal");
  const isAdminRoute = pathname.startsWith("/admin");

  if ((isPortal || isAdminRoute) && !isLoggedIn) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (isAdminRoute && isLoggedIn && !isAdmin) {
    return NextResponse.redirect(new URL("/portal", req.nextUrl.origin));
  }

  if (isAuthPage && isLoggedIn && !pathname.startsWith("/verify-email")) {
    return NextResponse.redirect(
      new URL(isAdmin ? "/admin" : "/portal", req.nextUrl.origin)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/portal/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ],
};
