import {
  CalendarSkeleton,
  CardGridSkeleton,
  DashboardSkeleton,
  TableSkeleton,
  PageHeaderSkeleton,
  StatCardsSkeleton,
} from "@/components/ui/Skeleton";

export default function PortalLoading() {
  return <DashboardSkeleton />;
}

export function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={3} />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="app-card h-80 p-4">
          <div className="h-full animate-pulse rounded bg-surface-dark" />
        </div>
        <div className="app-card h-80 p-4">
          <div className="h-full animate-pulse rounded bg-surface-dark" />
        </div>
      </div>
    </div>
  );
}

export function CalendarLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CalendarSkeleton />
    </div>
  );
}

export function PropertiesLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardGridSkeleton />
    </div>
  );
}

export function TableLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton />
    </div>
  );
}
