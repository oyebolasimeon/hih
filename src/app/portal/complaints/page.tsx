import ComplaintsClient from "@/components/portal/ComplaintsClient";

export default function PortalComplaintsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Complaints
        </h1>
        <p className="mt-1 text-sm text-muted">
          Tenants report issues on leased homes; landlords review and resolve
          them.
        </p>
      </div>
      <ComplaintsClient />
    </div>
  );
}
