import EmptyState from "@/components/ui/EmptyState";

export default function AdminFraudPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Fraud reports
        </h1>
        <p className="mt-1 text-sm text-muted">
          Review reports submitted by users about listings, payments, or
          profiles.
        </p>
      </div>
      <EmptyState
        title="No fraud reports"
        description="Coming online for MVP"
      />
    </div>
  );
}
