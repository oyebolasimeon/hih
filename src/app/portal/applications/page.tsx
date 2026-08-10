import ApplicationsClient from "@/components/portal/ApplicationsClient";

export default function PortalApplicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Applications
        </h1>
        <p className="mt-1 text-sm text-muted">
          Track rental applications you send or receive.
        </p>
      </div>
      <ApplicationsClient />
    </div>
  );
}
