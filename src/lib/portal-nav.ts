import type { ProfileType } from "@/models/Profile";

export type PortalNavLink = {
  href: string;
  label: string;
  exact?: boolean;
  /** When set, link only shows for these active profile types */
  forTypes?: ProfileType[];
};

export const PORTAL_NAV_LINKS: PortalNavLink[] = [
  { href: "/portal", label: "Dashboard", exact: true },
  {
    href: "/portal/search",
    label: "Search",
    forTypes: ["student", "tenant"],
  },
  {
    href: "/portal/listings",
    label: "My listings",
    forTypes: ["landlord", "estate_manager"],
  },
  { href: "/portal/applications", label: "Applications" },
  { href: "/portal/agreements", label: "Agreements" },
  { href: "/portal/payments", label: "Payments" },
  { href: "/portal/messages", label: "Messages" },
  {
    href: "/portal/services",
    label: "Services",
  },
  {
    href: "/portal/utilities",
    label: "Utilities",
    forTypes: ["student", "tenant"],
  },
  {
    href: "/portal/savings",
    label: "Savings",
    forTypes: ["student", "tenant"],
  },
  {
    href: "/portal/analytics",
    label: "Analytics",
    forTypes: ["landlord", "estate_manager"],
  },
  { href: "/portal/kyc", label: "KYC" },
  {
    href: "/portal/credit",
    label: "Credit",
    forTypes: ["student", "tenant"],
  },
  {
    href: "/portal/iot",
    label: "IoT",
    forTypes: ["landlord", "estate_manager", "tenant"],
  },
  { href: "/portal/maintenance", label: "Service requests" },
  { href: "/portal/complaints", label: "Complaints" },
  {
    href: "/portal/reviews",
    label: "Reviews",
    forTypes: ["student", "tenant"],
  },
  { href: "/portal/notifications", label: "Notifications" },
  { href: "/portal/profiles", label: "Profiles" },
  { href: "/portal/account", label: "Account" },
];

export function filterPortalNav(
  links: PortalNavLink[],
  profileType: ProfileType | null
) {
  if (!profileType) {
    return links.filter(
      (l) =>
        !l.forTypes ||
        l.href === "/portal/profiles" ||
        l.href === "/portal" ||
        l.href === "/portal/kyc" ||
        l.href === "/portal/account" ||
        l.href === "/portal/notifications"
    );
  }
  return links.filter((l) => !l.forTypes || l.forTypes.includes(profileType));
}

/** Returns restricted profile types for a path, or null if open to all active profiles. */
export function allowedTypesForPath(pathname: string): ProfileType[] | null {
  const matches = PORTAL_NAV_LINKS.filter(
    (l) =>
      l.href !== "/portal" &&
      (pathname === l.href || pathname.startsWith(`${l.href}/`))
  ).sort((a, b) => b.href.length - a.href.length);

  const exact = PORTAL_NAV_LINKS.find(
    (l) => l.exact && pathname === l.href
  );
  if (exact) return exact.forTypes || null;

  const best = matches[0];
  if (!best) return null;
  return best.forTypes || null;
}

export function canAccessPortalPath(
  pathname: string,
  profileType: ProfileType | null
): boolean {
  const allowed = allowedTypesForPath(pathname);
  if (!allowed) return true;
  if (!profileType) return false;
  return allowed.includes(profileType);
}
