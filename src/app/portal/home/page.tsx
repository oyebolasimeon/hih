import HomeClient from "@/components/portal/HomeClient";

export default function PortalHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          My Home
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Your property, costs, documents, payment history, conversations and
          exit options — in one place.
        </p>
      </div>
      <HomeClient />
    </div>
  );
}
