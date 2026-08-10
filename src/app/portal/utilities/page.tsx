import UtilitiesClient from "@/components/portal/UtilitiesClient";

export default function PortalUtilitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Utilities
        </h1>
        <p className="mt-1 text-sm text-muted">
          Pay electricity, water, waste, estate dues, and more in NGN.
        </p>
      </div>
      <UtilitiesClient />
    </div>
  );
}
