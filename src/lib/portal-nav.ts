import type { ProfileType } from "@/models/Profile";

export type PortalNavLink = {
  href: string;
  label: string;
  /** Role-specific label override (Property Management Model naming) */
  labelByType?: Partial<Record<ProfileType, string>>;
  exact?: boolean;
  /** When set, link only shows for these active profile types */
  forTypes?: ProfileType[];
};

export function resolveNavLabel(
  link: PortalNavLink,
  profileType: ProfileType | null
) {
  if (profileType && link.labelByType?.[profileType]) {
    return link.labelByType[profileType]!;
  }
  return link.label;
}

export const PORTAL_NAV_LINKS: PortalNavLink[] = [
  { href: "/portal", label: "Dashboard", exact: true },
  {
    href: "/portal/search",
    label: "Search",
    forTypes: ["student", "tenant"],
  },
  {
    href: "/portal/listings",
    label: "My Properties",
    forTypes: ["landlord", "estate_manager"],
  },
  {
    href: "/portal/applications",
    label: "Applications",
    labelByType: {
      landlord: "Tenants & applications",
      estate_manager: "Tenants & applications",
    },
  },
  {
    href: "/portal/agreements",
    label: "Agreements",
    labelByType: {
      landlord: "Documents",
      estate_manager: "Documents",
    },
  },
  {
    href: "/portal/payments",
    label: "Payments",
    labelByType: {
      landlord: "Rent & collections",
      estate_manager: "Rent & collections",
    },
  },
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
    labelByType: {
      landlord: "Occupancy & analytics",
      estate_manager: "Occupancy & analytics",
    },
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
  {
    href: "/portal/maintenance",
    label: "Maintenance",
  },
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
