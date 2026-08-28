"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { hasPermission, type Permission } from "@/lib/rbac";
import BrandMark from "@/components/BrandMark";
import MobileNavDrawer from "@/components/ui/MobileNavDrawer";
import { PageMotion } from "@/components/motion/Motion";

type NavLink = {
  href: string;
  label: string;
  permission?: Permission;
  exact?: boolean;
};

const links: NavLink[] = [
  { href: "/admin", label: "Dashboard", permission: "users:read", exact: true },
  { href: "/admin/users", label: "Users", permission: "users:read" },
  { href: "/admin/kyc", label: "KYC review", permission: "kyc:read" },
  { href: "/admin/listings", label: "Listings", permission: "listings:read" },
  { href: "/admin/fraud", label: "Fraud reports", permission: "fraud:read" },
  { href: "/admin/withdrawals", label: "Withdrawals", permission: "users:read" },
  { href: "/admin/content", label: "Website & brand", permission: "content:read" },
  { href: "/admin/emails", label: "Email templates", permission: "content:read" },
  { href: "/admin/audit", label: "Audit log", permission: "audit:read" },
  { href: "/admin/team", label: "Team & RBAC", permission: "admins:manage" },
  { href: "/admin/account", label: "Account" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const perms = session?.user?.permissions || [];
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleLinks = links.filter(
    (link) => !link.permission || hasPermission(perms, link.permission)
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="app-shell flex min-h-screen">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-surface">
        <div className="px-5 py-5 border-b border-border">
          <BrandMark href="/admin" size="sm" />
          <p className="text-xs text-muted mt-2">Admin Console</p>
          {session?.user?.role ? (
            <p className="mt-1 text-[11px] uppercase tracking-wider text-teal font-semibold">
              {session.user.role}
            </p>
          ) : null}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {visibleLinks.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative block rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  active
                    ? "bg-brand-subtle text-foreground"
                    : "text-muted hover:bg-surface-dark hover:text-foreground"
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="admin-nav-indicator"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/portal"
            className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface-dark transition-colors duration-200"
          >
            App view
          </Link>
        </nav>
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted">Theme</span>
            <ThemeToggle />
          </div>
          <p className="text-sm font-medium truncate">{session?.user?.name}</p>
          <p className="text-xs text-muted truncate">{session?.user?.email}</p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="app-btn app-btn-secondary w-full text-xs"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            type="button"
            className="lg:hidden rounded-md p-2 text-foreground hover:bg-surface-dark shrink-0"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <p className="hidden lg:block text-sm text-muted">Admin Console</p>
          <div className="flex items-center gap-3 ml-auto">
            <div className="lg:hidden">
              <BrandMark href="/admin" size="sm" />
            </div>
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <MobileNavDrawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          title="Admin Console"
          subtitle={session?.user?.role || "Operations"}
          links={visibleLinks.map(({ href, label, exact }) => ({
            href,
            label,
            exact,
          }))}
          extraLinks={[{ href: "/portal", label: "App view" }]}
          footer={
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted">Theme</span>
                <ThemeToggle />
              </div>
              <p className="text-sm font-medium truncate">{session?.user?.name}</p>
              <p className="text-xs text-muted truncate">{session?.user?.email}</p>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="app-btn app-btn-secondary w-full text-xs"
              >
                Sign out
              </button>
            </>
          }
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <PageMotion routeKey={pathname}>{children}</PageMotion>
        </main>
      </div>
    </div>
  );
}
