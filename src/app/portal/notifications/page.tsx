import NotificationsClient from "@/components/portal/NotificationsClient";

export default function PortalNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted">
          Application updates, payment reminders, and KYC status alerts.
        </p>
      </div>
      <NotificationsClient />
    </div>
  );
}
