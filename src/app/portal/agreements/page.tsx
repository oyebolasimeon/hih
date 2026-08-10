import AgreementsClient from "@/components/portal/AgreementsClient";

export default function PortalAgreementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Agreements
        </h1>
        <p className="mt-1 text-sm text-muted">
          Digital tenancy agreements and signatures in one place.
        </p>
      </div>
      <AgreementsClient />
    </div>
  );
}
