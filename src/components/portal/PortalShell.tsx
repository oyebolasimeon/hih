"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import BrandMark from "@/components/BrandMark";

const links = [
  { href: "/portal", label: "Dashboard", exact: true },
  { href: "/portal/search", label: "Search" },
  { href: "/portal/listings", label: "My listings" },
  { href: "/portal/applications", label: "Applications" },
  { href: "/portal/agreements", label: "Agreements" },
  { href: "/portal/payments", label: "Payments" },
  { href: "/portal/messages", label: "Messages" },
  { href: "/portal/utilities", label: "Utilities" },
  { href: "/portal/savings", label: "Savings" },
  { href: "/portal/analytics", label: "Analytics" },
  { href: "/portal/kyc", label: "KYC" },
  { href: "/portal/credit", label: "Credit" },
  { href: "/portal/iot", label: "IoT" },
  { href: "/portal/maintenance", label: "Maintenance" },
  { href: "/portal/reviews", label: "Reviews" },
  { href: "/portal/notifications", label: "Notifications" },
  { href: "/portal/profiles", label: "Profiles" },
  { href: "/portal/account", label: "Account" },
];

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="app-shell flex min-h-screen">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-surface">
        <div className="px-5 py-5 border-b border-border">
          <BrandMark href="/portal" size="sm" />
          <p className="text-xs text-muted mt-2">App</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-subtle text-foreground"
                    : "text-muted hover:bg-surface-dark hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {session?.user?.isAdmin ? (
            <Link
              href="/admin"
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface-dark hover:text-foreground"
            >
              Admin Console
            </Link>
          ) : null}
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
          <div className="lg:hidden">
            <BrandMark href="/portal" size="sm" />
          </div>
          <div className="hidden lg:block text-sm text-muted">
            Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="app-btn app-btn-secondary text-xs lg:hidden"
            >
              Sign out
            </button>
          </div>
        </header>

        <nav className="lg:hidden flex gap-1 overflow-x-auto border-b border-border px-3 py-2 bg-surface">
          {links.map((link) => {
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
