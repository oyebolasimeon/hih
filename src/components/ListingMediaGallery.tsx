"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type ListingMediaItem = {
  url: string;
  isPrimary?: boolean;
  mediaType?: "image" | "video";
};

function isVideoMedia(img: ListingMediaItem) {
  return (
    img.mediaType === "video" || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(img.url)
  );
}

type Props = {
  title: string;
  media: ListingMediaItem[];
  /** Marketing public page uses navy hero styling */
  variant?: "public" | "portal";
};

export default function ListingMediaGallery({
  title,
  media,
  variant = "public",
}: Props) {
  const items = useMemo(() => {
    const filtered = media.filter((m) => m.url);
    return [...filtered].sort((a, b) => {
      if (a.isPrimary === b.isPrimary) return 0;
      return a.isPrimary ? -1 : 1;
    });
  }, [media]);

  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    setActive(0);
  }, [items]);

  const current = items[active];
  const currentIsVideo = current ? isVideoMedia(current) : false;

  const go = useCallback(
    (delta: number) => {
      if (items.length < 2) return;
      setActive((i) => (i + delta + items.length) % items.length);
    },
    [items.length]
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, go]);

  const frameClass =
    variant === "public"
      ? "overflow-hidden border border-navy/10 bg-navy/5"
      : "overflow-hidden rounded-xl border border-border bg-surface";

  if (items.length === 0) {
    return (
      <div
        className={`${frameClass} flex aspect-[16/10] items-center justify-center sm:aspect-[2/1]`}
      >
        <p className="text-sm text-muted">No photos or videos yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`relative ${frameClass} aspect-[16/10] sm:aspect-[2/1]`}>
        {currentIsVideo ? (
          <video
            key={current.url}
            src={current.url}
            className="h-full w-full bg-black object-contain"
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <button
            type="button"
            className="h-full w-full cursor-zoom-in"
            onClick={() => setLightbox(true)}
            aria-label="Open photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={title}
              className="h-full w-full object-cover"
            />
          </button>
        )}

        {items.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-sm text-white hover:bg-black/75"
              aria-label="Previous media"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-sm text-white hover:bg-black/75"
              aria-label="Next media"
            >
              ›
            </button>
          </>
        ) : null}

        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="rounded bg-black/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
            {currentIsVideo ? "Video" : "Photo"} {active + 1}/{items.length}
          </span>
        </div>
      </div>

      {items.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((img, i) => {
            const video = isVideoMedia(img);
            return (
              <button
                key={`${img.url}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                className={`relative h-16 w-24 shrink-0 overflow-hidden border-2 transition sm:h-20 sm:w-28 ${
                  variant === "portal" ? "rounded-lg" : ""
                } ${
                  active === i
                    ? "border-teal opacity-100"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                {video ? (
                  <>
                    <video
                      src={img.url}
                      className="h-full w-full object-cover bg-black"
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-black/65 px-1 py-0.5 text-[9px] font-semibold uppercase text-white">
                      Video
                    </span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      ) : null}

      {lightbox && current && !currentIsVideo ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white"
            onClick={() => setLightbox(false)}
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={title}
            className="max-h-[90vh] max-w-[94vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
