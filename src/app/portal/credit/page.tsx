import CreditClient from "@/components/portal/CreditClient";

export default function PortalCreditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Credit score
        </h1>
        <p className="mt-1 text-sm text-muted">
          Heuristic housing credit score from KYC, payments, and lease history.
        </p>
      </div>
      <CreditClient />
    </div>
  );
}
