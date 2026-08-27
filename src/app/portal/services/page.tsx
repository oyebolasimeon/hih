import ServicesClient from "@/components/portal/ServicesClient";

export default function PortalServicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Property services
        </h1>
        <p className="mt-1 text-sm text-muted">
          Cleaning, security, estate dues, and other services tied to a home.
        </p>
      </div>
      <ServicesClient />
    </div>
  );
}
