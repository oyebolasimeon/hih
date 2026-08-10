import IoTClient from "@/components/portal/IoTClient";

export default function PortalIoTPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          IoT devices
        </h1>
        <p className="mt-1 text-sm text-muted">
          Pair smart locks, meters, and sensors — mock commands for now.
        </p>
      </div>
      <IoTClient />
    </div>
  );
}
