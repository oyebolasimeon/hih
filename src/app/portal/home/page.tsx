import HomeClient from "@/components/portal/HomeClient";

export default function PortalHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">
          Tenant hub
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-display font-semibold">
          My Home
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Property, costs, documents, calendar, conversations and exit — one
          place for your tenancy.
        </p>
      </div>
      <HomeClient />
    </div>
  );
}
