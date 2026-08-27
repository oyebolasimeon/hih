import SavingsClient from "@/components/portal/SavingsClient";

export default function PortalSavingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Savings
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Build rent and deposit funds with clear targets, progress tracking, and
          quick contributions along the way.
        </p>
      </div>
      <SavingsClient />
    </div>
  );
}
