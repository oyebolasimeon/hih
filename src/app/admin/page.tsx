import Link from "next/link";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

const cards = [
  {
    href: "/admin/kyc",
    title: "KYC review",
    description: "Review identity and profile verification submissions.",
    permission: "kyc:read" as const,
  },
  {
    href: "/admin/listings",
    title: "Listings verification",
    description: "Verify property listings before they go live.",
    permission: "listings:read" as const,
  },
  {
    href: "/admin/content",
    title: "Website content",
    description: "Manage marketing site content and auth backgrounds.",
    permission: "content:read" as const,
  },
  {
    href: "/admin/fraud",
    title: "Fraud reports",
    description: "Triage safety and fraud reports from the community.",
    permission: "fraud:read" as const,
  },
];

export default async function AdminDashboardPage() {
  const session = await auth();
  const perms = session?.user?.permissions;

  const visible = cards.filter(
    (card) => !card.permission || hasPermission(perms, card.permission)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Admin Console
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Operate House In Hand — KYC, listings, website content, and fraud
          reports.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {visible.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="app-card p-5 sm:p-6 block hover:border-brand/40 transition-colors"
          >
            <h2 className="font-display text-lg font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-muted">{card.description}</p>
            <span className="mt-4 inline-block text-sm font-medium text-brand-dark">
              Open →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
