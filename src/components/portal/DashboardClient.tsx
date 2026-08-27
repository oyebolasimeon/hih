"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";
import { useBranding } from "@/components/providers/BrandingProvider";
import { StatCardsSkeleton } from "@/components/ui/Skeleton";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import type { ProfileType } from "@/models/Profile";

const PROFILE_META: Record<
  ProfileType,
  { label: string; description: string; accent: string }
> = {
  student: {
    label: "Student",
    description: "Hostels and student-friendly homes near campus.",
    accent: "border-teal bg-teal/5",
  },
  tenant: {
    label: "Tenant",
    description: "Search rentals, apply, and manage agreements.",
    accent: "border-brand bg-brand/5",
  },
  landlord: {
    label: "Landlord",
    description: "List properties, review applicants, and track rent.",
    accent: "border-navy bg-navy/5 dark:bg-white/5",
  },
  estate_manager: {
    label: "Estate Manager",
    description: "Oversee estates, units, and resident onboarding.",
    accent: "border-muted bg-surface",
  },
};

type UserProfile = {
  id: string;
  type: ProfileType;
  displayName: string;
  status: string;
};

type AppRow = {
  id: string;
  applicantUserId: string;
  status: string;
};

type RecListing = {
  id: string;
  title: string;
  address?: { city?: string; state?: string };
  price?: { amount: number; currency: string; period: string };
  images?: { url: string; isPrimary?: boolean }[];
  verificationStatus?: string;
};

type QuickAction = {
  href: string;
  label: string;
  description: string;
  forTypes?: ProfileType[];
  icon: ReactNode;
};

const ICONS = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" strokeLinejoin="round" />
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <path d="M8 4h8l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1h3z" />
      <path d="M16 4v4h4M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  ),
  payment: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M7 15h2" strokeLinecap="round" />
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <path d="M5 5h14a2 2 0 012 2v9a2 2 0 01-2 2H9l-4 3v-3H5a2 2 0 01-2-2V7a2 2 0 012-2z" strokeLinejoin="round" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <path d="M4 19V5M4 19h16M8 16V11M12 16V8M16 16v-4" strokeLinecap="round" />
    </svg>
  ),
  wrench: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <path d="M14.5 6.5a4.5 4.5 0 01-6.4 6.4L4 17l3 3 4.1-4.1a4.5 4.5 0 006.4-6.4l-2 2-1.4-1.4 2-2z" strokeLinejoin="round" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <path d="M12 3l8 4v6c0 5-3.5 7.5-8 8-4.5-.5-8-3-8-8V7l8-4z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" strokeLinecap="round" />
    </svg>
  ),
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/portal/search",
    label: "Search homes",
    description: "Browse verified listings",
    forTypes: ["student", "tenant"],
    icon: ICONS.search,
  },
  {
    href: "/portal/listings",
    label: "My listings",
    description: "Manage your properties",
    forTypes: ["landlord", "estate_manager"],
    icon: ICONS.home,
  },
  {
    href: "/portal/applications",
    label: "Applications",
    description: "Track submissions",
    icon: ICONS.file,
  },
  {
    href: "/portal/payments",
    label: "Payments",
    description: "Rent and billing",
    icon: ICONS.payment,
  },
  {
    href: "/portal/messages",
    label: "Messages",
    description: "Landlord conversations",
    icon: ICONS.message,
  },
  {
    href: "/portal/credit",
    label: "Credit score",
    description: "Build rental history",
    forTypes: ["student", "tenant"],
    icon: ICONS.chart,
  },
  {
    href: "/portal/analytics",
    label: "Analytics",
    description: "Portfolio insights",
    forTypes: ["landlord", "estate_manager"],
    icon: ICONS.chart,
  },
  {
    href: "/portal/maintenance",
    label: "Service requests",
    description: "Repairs and upkeep",
    icon: ICONS.wrench,
  },
  {
    href: "/portal/profiles",
    label: "Profiles",
    description: "Switch or add roles",
    icon: ICONS.user,
  },
  {
    href: "/portal/kyc",
    label: "Verify identity",
    description: "Complete KYC",
    icon: ICONS.shield,
  },
];

function formatPrice(p: RecListing["price"]) {
  if (!p) return "";
  try {
    return `${new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: p.currency || "NGN",
      maximumFractionDigits: 0,
    }).format(p.amount)} / ${p.period}`;
  } catch {
    return `${p.currency} ${p.amount} / ${p.period}`;
  }
}

function profileLabel(type: ProfileType) {
  return PROFILE_META[type].label;
}

function heroCopy(profileType: ProfileType | null) {
  if (profileType === "landlord" || profileType === "estate_manager") {
    return {
      subtitle:
        "List properties, review applicants, and track rent from one place.",
      cta: { href: "/portal/listings", label: "Manage listings" },
    };
  }
  if (profileType === "student" || profileType === "tenant") {
    return {
      subtitle:
        "Find homes, track applications, pay rent, and manage agreements.",
      cta: { href: "/portal/search", label: "Search homes" },
    };
  }
  return {
    subtitle:
      "Create a profile to unlock housing search, listings, payments, and more.",
    cta: { href: "/portal/profiles", label: "Set up profile" },
  };
}

type Props = {
  name: string;
};

export default function DashboardClient({ name }: Props) {
  const { data: session } = useSession();
  const { branding } = useBranding();
  const heroImage = branding.authBackgroundUrl || "/hero-home.jpg";
  const {
    profile,
    profileType,
    isLandlordLike,
    isTenantLike,
    loading: profileLoading,
  } = useActiveProfile();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [applications, setApplications] = useState<AppRow[]>([]);
  const [recs, setRecs] = useState<RecListing[]>([]);
  const [recReason, setRecReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const fetches: Promise<Response>[] = [
          fetch("/api/portal/profiles"),
          fetch("/api/portal/applications"),
        ];
        if (!isLandlordLike) {
          fetches.push(fetch("/api/portal/recommendations"));
        }
        const results = await Promise.all(fetches);
        const [pRes, aRes, rRes] = results;
        const pData = await pRes.json();
        const aData = await aRes.json();
        if (pRes.ok) {
          setProfiles(pData.profiles || []);
          setActiveProfileId(pData.activeProfileId || null);
        }
        if (aRes.ok) setApplications(aData.applications || []);
        if (rRes) {
          const rData = await rRes.json();
          if (rRes.ok) {
            setRecs(rData.recommendations || []);
            setRecReason(rData.reason || "");
          }
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [isLandlordLike]);

  const hero = heroCopy(profileType);
  const firstName = name.split(" ")[0] || name;

  const stats = useMemo(() => {
    const userId = session?.user?.id || "";
    const openStatuses = ["submitted", "under_review"];
    const myPending = applications.filter(
      (a) =>
        a.applicantUserId === userId && openStatuses.includes(a.status)
    ).length;
    const incoming = applications.filter(
      (a) =>
        a.applicantUserId !== userId && openStatuses.includes(a.status)
    ).length;
    const verifiedProfiles = profiles.filter((p) => p.status === "verified").length;

    if (isLandlordLike) {
      return [
        {
          label: "Open applications",
          value: String(incoming),
          href: "/portal/applications",
        },
        { label: "Profiles", value: String(profiles.length), href: "/portal/profiles" },
        {
          label: "KYC verified",
          value: profiles.length
            ? `${verifiedProfiles}/${profiles.length}`
            : "0",
          href: "/portal/kyc",
        },
      ];
    }

    return [
      {
        label: "Active applications",
        value: String(myPending),
        href: "/portal/applications",
      },
      {
        label: "Profile status",
        value: profile?.status === "verified" ? "Verified" : "Action needed",
        href: "/portal/kyc",
      },
      { label: "Profiles", value: String(profiles.length), href: "/portal/profiles" },
    ];
  }, [applications, profiles, profile, isLandlordLike, session?.user?.id]);

  const quickActions = useMemo(() => {
    const filtered = QUICK_ACTIONS.filter(
      (a) => !a.forTypes || (profileType && a.forTypes.includes(profileType))
    );
    if (!profileType) {
      return QUICK_ACTIONS.filter((a) =>
        ["/portal/profiles", "/portal/kyc", "/portal/search", "/portal/applications"].includes(a.href)
      );
    }
    return filtered.slice(0, 6);
  }, [profileType]);

  const setupSteps = useMemo(() => {
    const hasProfile = profiles.length > 0;
    const kycDone = profiles.some((p) => p.status === "verified");
    const hasActivity = applications.length > 0;
    return [
      { done: hasProfile, label: "Create a profile", href: "/portal/profiles" },
      { done: kycDone, label: "Complete identity verification", href: "/portal/kyc" },
      {
        done: hasActivity,
        label: isLandlordLike ? "List or manage a property" : "Search and apply to a home",
        href: isLandlordLike ? "/portal/listings" : "/portal/search",
      },
    ];
  }, [profiles, applications, isLandlordLike]);

  const showSetup = setupSteps.some((s) => !s.done);
  const showProfilePicker = profiles.length === 0;

  if (profileLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="app-card p-8">
          <StatCardsSkeleton count={1} />
        </div>
        <StatCardsSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Reveal>
        <section className="app-card overflow-hidden">
          <div className="relative min-h-[220px] sm:min-h-[240px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/82 to-navy/55" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-navy/20" />

            <div className="relative z-10 flex flex-col gap-5 px-6 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-10">
              <div className="space-y-3 max-w-xl">
                <p className="site-kicker flex items-center gap-2 text-teal">
                  <span className="site-live-dot" aria-hidden />
                  Your workspace
                </p>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-semibold tracking-tight text-white">
                  Good to see you, {firstName}
                </h1>
                <p className="text-sm sm:text-base text-sand/80 leading-relaxed">
                  {hero.subtitle}
                </p>
                {profile ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                    <span className="h-2 w-2 rounded-full bg-teal" aria-hidden />
                    Active as {profile.displayName} · {profileLabel(profile.type)}
                  </div>
                ) : null}
              </div>
              <Link href={hero.cta.href} className="app-btn app-btn-primary shrink-0">
                {hero.cta.label}
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      <section className="grid sm:grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <Reveal key={stat.label} delay={0.04 * i}>
            <Link
              href={stat.href}
              className="app-card app-card-interactive block p-4 sm:p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-display font-semibold">{stat.value}</p>
            </Link>
          </Reveal>
        ))}
      </section>

      <section className="space-y-3">
        <Reveal>
          <h2 className="font-display text-lg font-semibold">Quick actions</h2>
          <p className="text-sm text-muted">Jump to the tools you use most.</p>
        </Reveal>
        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <StaggerItem key={action.href}>
              <Link
                href={action.href}
                className="app-card app-card-interactive flex items-start gap-3 p-4 h-full"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand-dark">
                  {action.icon}
                </span>
                <span>
                  <span className="block font-semibold text-sm">{action.label}</span>
                  <span className="mt-0.5 block text-xs text-muted leading-relaxed">
                    {action.description}
                  </span>
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {isTenantLike && recs.length > 0 ? (
        <section className="space-y-3">
          <Reveal delay={0.05}>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Recommended for you
                </h2>
                {recReason ? (
                  <p className="text-sm text-muted">{recReason}</p>
                ) : null}
              </div>
              <Link
                href="/portal/search"
                className="text-sm font-medium text-brand-dark hover:underline"
              >
                Browse all
              </Link>
            </div>
          </Reveal>
          <Stagger className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {recs.slice(0, 4).map((l) => {
              const img =
                l.images?.find((i) => i.isPrimary)?.url || l.images?.[0]?.url;
              return (
                <StaggerItem key={l.id}>
                  <Link
                    href={`/portal/search/${l.id}`}
                    className="app-card app-card-interactive block overflow-hidden h-full"
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="h-36 w-full object-cover"
                      />
                    ) : (
                      <div className="h-36 w-full bg-surface" />
                    )}
                    <div className="p-4 space-y-1">
                      <p className="font-semibold text-sm line-clamp-2">{l.title}</p>
                      <p className="text-xs text-muted">
                        {[l.address?.city, l.address?.state]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {l.price ? (
                        <p className="text-sm font-medium pt-1">
                          {formatPrice(l.price)}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>
      ) : null}

      {showProfilePicker ? (
        <section className="space-y-3">
          <Reveal>
            <h2 className="font-display text-lg font-semibold">Choose your role</h2>
            <p className="text-sm text-muted">
              Pick how you&apos;ll use House In Hand — you can add more profiles later.
            </p>
          </Reveal>
          <Stagger className="grid sm:grid-cols-2 gap-3">
            {(Object.keys(PROFILE_META) as ProfileType[]).map((key) => {
              const meta = PROFILE_META[key];
              return (
                <StaggerItem key={key}>
                  <Link
                    href="/portal/profiles"
                    className={`app-card app-card-interactive block p-5 border-l-4 ${meta.accent}`}
                  >
                    <h3 className="font-display font-semibold">{meta.label}</h3>
                    <p className="mt-1.5 text-sm text-muted leading-relaxed">
                      {meta.description}
                    </p>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>
      ) : profiles.length > 1 ? (
        <section className="space-y-3">
          <Reveal>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">Your profiles</h2>
              <Link
                href="/portal/profiles"
                className="text-sm font-medium text-brand-dark hover:underline"
              >
                Manage
              </Link>
            </div>
          </Reveal>
          <div className="flex flex-wrap gap-2">
            {profiles.map((p) => {
              const active = p.id === activeProfileId;
              return (
                <Link
                  key={p.id}
                  href="/portal/profiles"
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                    active
                      ? "border-brand bg-brand/10 font-semibold text-foreground"
                      : "border-border bg-card text-muted hover:border-brand/40 hover:text-foreground"
                  }`}
                >
                  {profileLabel(p.type)}
                  {active ? (
                    <span className="text-[10px] uppercase tracking-wider text-brand-dark">
                      Active
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {showSetup ? (
        <Reveal delay={0.1}>
          <section className="app-card p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">Getting started</h2>
            <p className="mt-1 text-sm text-muted">
              A few steps to unlock the full platform.
            </p>
            <ul className="mt-4 space-y-2">
              {setupSteps.map((step) => (
                <li key={step.label}>
                  <Link
                    href={step.href}
                    className="flex items-center gap-3 rounded-md px-2 py-2 -mx-2 hover:bg-surface/80 transition-colors"
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        step.done
                          ? "bg-brand text-[#0c0d0b]"
                          : "border border-border text-muted"
                      }`}
                      aria-hidden
                    >
                      {step.done ? "✓" : ""}
                    </span>
                    <span
                      className={`text-sm ${
                        step.done ? "text-muted line-through" : "font-medium"
                      }`}
                    >
                      {step.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      ) : null}
    </div>
  );
}
