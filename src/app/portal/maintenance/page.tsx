import MaintenanceClient from "@/components/portal/MaintenanceClient";

export default function PortalMaintenancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Maintenance
        </h1>
        <p className="mt-1 text-sm text-muted">
          Log and track property issues with predictive insights.
        </p>
      </div>
      <MaintenanceClient />
    </div>
  );
}
