import EmptyState from "@/components/ui/EmptyState";

export default function PortalPaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Payments
        </h1>
        <p className="mt-1 text-sm text-muted">
          View rent payments, deposits, and payout history.
        </p>
      </div>
      <EmptyState title="Payments" description="Coming online for MVP" />
    </div>
  );
}
