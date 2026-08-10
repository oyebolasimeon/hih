import ListingsClient from "@/components/portal/ListingsClient";

export default function PortalListingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          My listings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Create and manage property listings as a landlord or estate manager.
        </p>
      </div>
      <ListingsClient />
    </div>
  );
}
