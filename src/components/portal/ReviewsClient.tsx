"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
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

type Props = {
  listingId?: string;
  compact?: boolean;
};

export default function ReviewsClient({ listingId, compact }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [manualListingId, setManualListingId] = useState(listingId || "");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const q = listingId
      ? `?listingId=${encodeURIComponent(listingId)}`
      : "";
    const res = await fetch(`/api/portal/reviews${q}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load reviews.");
      return;
    }
    setReviews(data.reviews || []);
    setAverageRating(
      typeof data.averageRating === "number" ? data.averageRating : null
    );
  }, [listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const targetListingId = listingId || manualListingId;
    if (!targetListingId) {
      setError("Listing ID is required.");
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

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand-dark">{message}</p> : null}

      {listingId && averageRating != null ? (
        <p className="text-sm text-muted">
          Average {averageRating.toFixed(1)} / 5 · {reviews.length} review
          {reviews.length === 1 ? "" : "s"}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="app-card p-4 space-y-3 max-w-xl">
        <h2 className="font-semibold text-sm">Leave a review</h2>
        {!listingId ? (
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Listing ID
            </label>
            <input
              className="app-input w-full"
              value={manualListingId}
              onChange={(e) => setManualListingId(e.target.value)}
              required
            />
          </div>
        ) : null}
        <div>
          <label className="block text-sm font-medium mb-1.5">Rating</label>
          <select
            className="app-input w-full"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Comment</label>
          <textarea
            className="app-input w-full min-h-[72px]"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
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
            <li key={r.id} className="app-card p-4 space-y-1">
              <p className="font-medium text-sm">
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
                {r.reviewerName ? ` · ${r.reviewerName}` : ""}
              </p>
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
