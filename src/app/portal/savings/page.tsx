import SavingsClient from "@/components/portal/SavingsClient";

export default function PortalSavingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Savings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Set rent and deposit targets and track deposits over time.
        </p>
      </div>
      <SavingsClient />
    </div>
  );
}
