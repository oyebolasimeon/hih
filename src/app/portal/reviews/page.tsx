import ReviewsClient from "@/components/portal/ReviewsClient";

export default function PortalReviewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Reviews
        </h1>
        <p className="mt-1 text-sm text-muted">
          Rate homes you have stayed in or applied for.
        </p>
      </div>
      <ReviewsClient />
    </div>
  );
}
