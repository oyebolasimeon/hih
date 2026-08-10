import ProfilesClient from "@/components/portal/ProfilesClient";

export default function PortalProfilesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Profiles
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          One account, multiple roles. Create Student, Tenant, Landlord, or
          Estate Manager profiles — then switch which one is active. KYC is
          required per profile before full access.
        </p>
      </div>
      <ProfilesClient />
    </div>
  );
}
