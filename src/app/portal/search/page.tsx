import SearchClient from "@/components/portal/SearchClient";

export default function PortalSearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">Search</h1>
        <p className="mt-1 text-sm text-muted">
          Find verified homes, hostels, and rentals across Nigeria.
        </p>
      </div>
      <SearchClient />
    </div>
  );
}
