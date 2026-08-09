"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "@/components/providers/ThemeProvider";

const links = [
  { href: "/admin", label: "Investors" },
  { href: "/admin/investors/new", label: "Find / onboard" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

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
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((link) => {
            const active =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);
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
        <div className="p-4 border-t border-border space-y-2">
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
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur px-4 sm:px-6 py-3 flex items-center justify-between">
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
          <button type="button" onClick={toggleTheme} className="app-btn app-btn-secondary text-xs">
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
