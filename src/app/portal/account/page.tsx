import AccountSettings from "@/components/account/AccountSettings";

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Account
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Manage your login details, notifications, appearance, and password.
        </p>
      </div>
      <AccountSettings hideHeader />
    </div>
  );
}
