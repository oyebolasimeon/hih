import BuildingIssuesClient from "@/components/portal/BuildingIssuesClient";

export default function PortalBuildingIssuesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Building issues
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Report facility problems with proof. The House In Hands AI Property
          Manager validates the case, escalates to the landlord with recommended
          actions, and tracks progress until closed.
        </p>
      </div>
      <BuildingIssuesClient />
    </div>
  );
}
