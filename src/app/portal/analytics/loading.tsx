import { PageHeaderSkeleton, StatCardsSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={3} />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="app-card h-80 animate-pulse bg-surface-dark" />
        <div className="app-card h-80 animate-pulse bg-surface-dark" />
      </div>
    </div>
  );
}
