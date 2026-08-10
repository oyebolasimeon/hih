import MessagesClient from "@/components/portal/MessagesClient";

export default function PortalMessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Messages
        </h1>
        <p className="mt-1 text-sm text-muted">
          Chat with landlords, tenants, and estate managers.
        </p>
      </div>
      <MessagesClient />
    </div>
  );
}
