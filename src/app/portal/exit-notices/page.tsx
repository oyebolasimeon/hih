import ExitNoticesClient from "@/components/portal/ExitNoticesClient";

export default function PortalExitNoticesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Exit notices
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Issue or request an exit based on your tenancy agreement. House In
          Hands AI and legal/ops review every notice before it is served, and
          decide any remaining-rent refund.
        </p>
      </div>
      <ExitNoticesClient />
    </div>
  );
}
