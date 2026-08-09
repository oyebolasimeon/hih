"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "@/components/ui/ThemeToggle";

const links = [
  { href: "/portal", label: "Dashboard", exact: true },
  { href: "/portal/analytics", label: "Analytics" },
  { href: "/portal/calendar", label: "Calendar" },
  { href: "/portal/properties", label: "Properties" },
  { href: "/portal/opportunities", label: "Opportunities" },
  { href: "/portal/activity", label: "Activity" },
  { href: "/portal/account", label: "Account" },
];

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="app-shell flex min-h-screen">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-surface">
        <div className="px-5 py-5 border-b border-border">
          <Link href="/portal" className="inline-flex items-center gap-2">
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
          <p className="text-xs text-muted mt-2">Investor Portal</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
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
            <Link href="/portal" className="inline-flex items-center gap-2 px-2 py-1 bg-brand rounded">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Nova Elite Homes"
                className="h-5 w-5 rounded-sm object-contain"
              />
              <span className="text-sm font-semibold text-foreground">Nova Elite</span>
            </Link>
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
