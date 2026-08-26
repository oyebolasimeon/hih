import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import AdminHomeClient from "@/components/admin/AdminHomeClient";

const cards = [
  {
    href: "/admin/users",
    title: "Users",
    description:
      "Verify emails and profiles manually — even without uploaded KYC documents.",
    permission: "users:read" as const,
  },
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

  const visible = cards
    .filter((card) => !card.permission || hasPermission(perms, card.permission))
    .map(({ href, title, description }) => ({ href, title, description }));

  return <AdminHomeClient cards={visible} />;
}
