import AnalyticsClient from "@/components/portal/AnalyticsClient";

export default function PortalAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-muted">
          Occupancy, applications, rent collection, and arrears for your estate.
        </p>
      </div>
      <AnalyticsClient />
    </div>
  );
}
