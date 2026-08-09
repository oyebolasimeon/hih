"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { hasPermission, type Permission } from "@/lib/rbac";

type NavLink = {
  href: string;
  label: string;
  permission?: Permission;
  exact?: boolean;
};

const links: NavLink[] = [
  { href: "/admin", label: "Investors", permission: "investors:read", exact: true },
  { href: "/admin/properties", label: "Properties", permission: "properties:read" },
  { href: "/admin/investors/new", label: "Find / onboard", permission: "investors:write" },
  { href: "/admin/content", label: "Login modal", permission: "content:read" },
  { href: "/admin/emails", label: "Email templates", permission: "content:read" },
  { href: "/admin/audit", label: "Audit log", permission: "audit:read" },
  { href: "/admin/team", label: "Team & RBAC", permission: "admins:manage" },
  { href: "/admin/account", label: "Account" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const perms = session?.user?.permissions || [];

  const visibleLinks = links.filter(
    (link) => !link.permission || hasPermission(perms, link.permission)
  );

  return (
    <div className="app-shell flex min-h-screen">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-surface">
        <div className="px-5 py-5 border-b border-border">
          <Link href="/admin" className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-2 py-1.5 bg-brand rounded">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Nova Elite Homes"
                className="h-5 w-5 rounded-sm object-contain"
              />
              <span className="text-sm font-semibold text-foreground tracking-tight">
                Nova Elite Homes
              </span>
            </span>
          </Link>
          <p className="text-xs text-muted mt-2">Admin Console</p>
          {session?.user?.role ? (
            <p className="mt-1 text-[11px] uppercase tracking-wider text-brand font-semibold">
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
                className={`block rounded-md px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-brand-subtle text-foreground"
                    : "text-muted hover:bg-surface-dark hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/portal"
            className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface-dark"
          >
            Investor view
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
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/admin" className="inline-flex items-center gap-2 px-2 py-1 bg-brand rounded lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Nova Elite Homes"
              className="h-5 w-5 rounded-sm object-contain"
            />
            <span className="text-sm font-semibold text-foreground">Admin</span>
          </Link>
          <p className="hidden lg:block text-sm text-muted">Admin Console</p>
          <div className="flex items-center gap-3 ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <nav className="lg:hidden flex gap-1 overflow-x-auto border-b border-border px-3 py-2 bg-surface">
          {visibleLinks.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${
                  active ? "bg-brand text-[#0c0d0b]" : "text-muted"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
