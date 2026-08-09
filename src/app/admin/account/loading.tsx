import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 max-w-xl">
      <PageHeaderSkeleton />
      <FormSkeleton />
    </div>
  );
}
