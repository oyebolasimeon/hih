"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import BrandMark from "@/components/BrandMark";
import MobileNavDrawer from "@/components/ui/MobileNavDrawer";
import { PageMotion } from "@/components/motion/Motion";
import {
  PORTAL_NAV_LINKS,
  canAccessPortalPath,
  filterPortalNav,
  type PortalNavLink,
} from "@/lib/portal-nav";
import type { ProfileType } from "@/models/Profile";

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [profileType, setProfileType] = useState<ProfileType | null>(null);
  const [profileLabel, setProfileLabel] = useState("");
  const [profileReady, setProfileReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/portal/profiles");
        const data = await res.json();
        if (!res.ok) {
          setProfileReady(true);
          return;
        }
        const activeId = data.activeProfileId as string | null;
        const profiles = (data.profiles || []) as {
          id: string;
          type: ProfileType;
          displayName: string;
        }[];
        const active = profiles.find((p) => p.id === activeId) || profiles[0];
        if (active) {
          setProfileType(active.type);
          setProfileLabel(
            `${active.displayName} · ${active.type.replace("_", " ")}`
          );
        } else {
          setProfileType(null);
          setProfileLabel("");
        }
      } catch {
        /* ignore */
      } finally {
        setProfileReady(true);
      }
    })();
  }, [pathname]);

  useEffect(() => {
    if (!profileReady) return;
    if (!canAccessPortalPath(pathname, profileType)) {
      router.replace("/portal");
    }
  }, [pathname, profileType, profileReady, router]);

  const links: PortalNavLink[] = filterPortalNav(PORTAL_NAV_LINKS, profileType);
  const drawerLinks = links.map(({ href, label, exact }) => ({
    href,
    label,
    exact,
  }));
  const extraLinks = session?.user?.isAdmin
    ? [{ href: "/admin", label: "Admin Console" }]
    : [];

  function renderNav(items: PortalNavLink[]) {
    return items.map((link) => {
      const active = link.exact
        ? pathname === link.href
        : pathname.startsWith(link.href);
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
              layoutId="portal-nav-indicator"
              className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          ) : null}
          {link.label}
        </Link>
      );
    });
  }

  return (
    <div className="app-shell flex min-h-screen">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-surface">
        <div className="px-5 py-5 border-b border-border">
          <BrandMark href="/portal" size="sm" />
          <p className="text-xs text-muted mt-2">{profileLabel || "App"}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {renderNav(links)}
          {session?.user?.isAdmin ? (
            <Link
              href="/admin"
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface-dark hover:text-foreground transition-colors duration-200"
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
          <div className="hidden lg:block text-sm text-muted">
            Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}
            {profileLabel ? ` · ${profileLabel}` : ""}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="lg:hidden">
              <BrandMark href="/portal" size="sm" />
            </div>
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="app-btn app-btn-secondary text-xs hidden sm:inline-flex"
            >
              Sign out
            </button>
          </div>
        </header>

        <MobileNavDrawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          title="House In Hand"
          subtitle={profileLabel || "App navigation"}
          links={drawerLinks}
          extraLinks={extraLinks}
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
