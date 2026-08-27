"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import { TableSkeleton } from "@/components/ui/Skeleton";

type Review = {
  id: string;
  listingId: string;
  rating: number;
  comment: string;
  reviewerName: string | null;
  listingTitle: string | null;
  createdAt: string;
};

type ReviewableListing = {
  listingId: string;
  title: string;
  city?: string;
  state?: string;
  context: "leased" | "applied";
  contextLabel: string;
  imageUrl?: string;
};

type Props = {
  listingId?: string;
  compact?: boolean;
};

function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
}: {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
}) {
  const [hover, setHover] = useState(0);
  const starSize = size === "sm" ? "h-4 w-4" : "h-7 w-7";
  const active = hover || value;

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role={readOnly ? "img" : "radiogroup"}
      aria-label={readOnly ? `${value} out of 5 stars` : "Rating"}
      onMouseLeave={() => !readOnly && setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= active;
        if (readOnly) {
          return (
            <span key={star} className={filled ? "text-brand" : "text-border"}>
              <StarIcon filled={filled} className={starSize} />
            </span>
          );
        }
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            className={`rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${
              filled ? "text-brand" : "text-border hover:text-brand/60"
            }`}
            onMouseEnter={() => setHover(star)}
            onClick={() => onChange?.(star)}
          >
            <StarIcon filled={filled} className={starSize} />
          </button>
        );
      })}
    </div>
  );
}

function StarIcon({
  filled,
  className = "",
}: {
  filled: boolean;
  className?: string;
}) {
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinejoin="round" />
    </svg>
  );
}

function ratingLabel(value: number) {
  const labels: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very good",
    5: "Excellent",
  };
  return labels[value] || "";
}

function locationLabel(listing: ReviewableListing) {
  const parts = [listing.city, listing.state].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export default function ReviewsClient({ listingId, compact }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [eligible, setEligible] = useState<ReviewableListing[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [selectedListingId, setSelectedListingId] = useState(listingId || "");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const q = listingId ? `?listingId=${encodeURIComponent(listingId)}` : "";
    const requests: Promise<Response>[] = [fetch(`/api/portal/reviews${q}`)];
    if (!listingId) {
      requests.push(fetch("/api/portal/reviews/eligible"));
    }
    const [reviewsRes, eligibleRes] = await Promise.all(requests);
    const data = await reviewsRes.json();
    setLoading(false);
    if (!reviewsRes.ok) {
      setError(data.error || "Unable to load reviews.");
      return;
    }
    const loadedReviews = (data.reviews || []) as Review[];
    setReviews(loadedReviews);
    setAverageRating(
      typeof data.averageRating === "number" ? data.averageRating : null
    );

    if (!listingId && eligibleRes) {
      const eligibleData = await eligibleRes.json();
      if (eligibleRes.ok) {
        const listings = (eligibleData.listings || []) as ReviewableListing[];
        setEligible(listings);
        const reviewedIds = new Set(loadedReviews.map((r) => r.listingId));
        const available = listings.filter(
          (l) => !reviewedIds.has(l.listingId)
        );
        setSelectedListingId((current) => {
          if (current && available.some((l) => l.listingId === current)) {
            return current;
          }
          return available[0]?.listingId || "";
        });
      } else {
        setEligible([]);
      }
    }
  }, [listingId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  const reviewedIds = useMemo(
    () => new Set(reviews.map((r) => r.listingId)),
    [reviews]
  );

  const availableListings = useMemo(
    () => eligible.filter((l) => !reviewedIds.has(l.listingId)),
    [eligible, reviewedIds]
  );

  const selectedListing = useMemo(
    () =>
      availableListings.find((l) => l.listingId === selectedListingId) ||
      eligible.find((l) => l.listingId === selectedListingId) ||
      null,
    [availableListings, eligible, selectedListingId]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const targetListingId = listingId || selectedListingId;
    if (!targetListingId) {
      setError("Select a property to review.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: targetListingId,
        rating,
        comment: comment || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not submit review.");
      return;
    }
    setComment("");
    setMessage("Review submitted.");
    await load();
  }

  if (loading) return <TableSkeleton rows={compact ? 2 : 4} />;

  const showFullPageForm = !listingId;

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand-dark">{message}</p> : null}

      {listingId && averageRating != null ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <StarRating value={Math.round(averageRating)} readOnly size="sm" />
          <span>
            {averageRating.toFixed(1)} average · {reviews.length} review
            {reviews.length === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}

      {showFullPageForm && eligible.length === 0 ? (
        <EmptyState
          title="No homes to review yet"
          description="You can review properties after you apply or move in. Browse listings to find a place you might want to stay."
        >
          <Link href="/portal/search" className="app-btn app-btn-primary text-sm">
            Browse listings
          </Link>
        </EmptyState>
      ) : showFullPageForm && availableListings.length === 0 ? (
        <EmptyState
          title="All caught up"
          description="You've reviewed every home you've applied for or stayed in. Browse listings to discover more properties."
        >
          <Link href="/portal/search" className="app-btn app-btn-primary text-sm">
            Browse listings
          </Link>
        </EmptyState>
      ) : (
        <form onSubmit={onSubmit} className="app-card p-4 space-y-3 max-w-xl">
          <h2 className="font-semibold text-sm">Leave a review</h2>
          {!listingId ? (
            <div className="space-y-3">
              <div>
                <Select
                  label="Property"
                  value={selectedListingId}
                  onChange={setSelectedListingId}
                  required
                  options={availableListings.map((l) => ({
                    value: l.listingId,
                    label: `${l.title}${
                      locationLabel(l) ? ` · ${locationLabel(l)}` : ""
                    } · ${l.contextLabel}`,
                  }))}
                  placeholder="Choose a property"
                />
              </div>
              {selectedListing ? (
                <div className="flex gap-3 rounded-lg border border-border/60 p-3 bg-muted/20">
                  {selectedListing.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedListing.imageUrl}
                      alt=""
                      className="h-16 w-20 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-20 rounded-md bg-muted/40 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {selectedListing.title}
                    </p>
                    {locationLabel(selectedListing) ? (
                      <p className="text-xs text-muted">
                        {locationLabel(selectedListing)}
                      </p>
                    ) : null}
                    <p className="text-xs text-brand-dark mt-0.5">
                      {selectedListing.contextLabel}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-medium mb-2">Rating</label>
            <div className="flex flex-wrap items-center gap-3">
              <StarRating value={rating} onChange={setRating} />
              <span className="text-sm text-muted">
                {rating} star{rating === 1 ? "" : "s"}
                {ratingLabel(rating) ? ` · ${ratingLabel(rating)}` : ""}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Comment</label>
            <textarea
              className="app-input w-full min-h-[72px]"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this home"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="app-btn app-btn-primary text-sm"
          >
            {saving ? "Submitting…" : "Submit review"}
          </button>
        </form>
      )}

      {reviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description={
            listingId
              ? "Be the first to rate this home."
              : "Reviews you write will appear here."
          }
        />
      ) : (
        <ul className="space-y-2">
          {reviews.map((r) => (
            <li key={r.id} className="app-card p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StarRating value={r.rating} readOnly size="sm" />
                {r.reviewerName ? (
                  <span className="text-sm font-medium">{r.reviewerName}</span>
                ) : null}
              </div>
              {!listingId && r.listingTitle ? (
                <p className="text-xs text-muted">{r.listingTitle}</p>
              ) : null}
              {r.comment ? (
                <p className="text-sm text-muted">{r.comment}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
