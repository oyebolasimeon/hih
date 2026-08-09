"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Props = {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
  title?: string;
  propertyId?: string;
};

async function syncMediaPref(payload: {
  starredUrls?: string[];
  bookmarkedUrls?: string[];
}) {
  const res = await fetch("/api/account/media-prefs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export default function ImageViewer({
  images,
  initialIndex = 0,
  open,
  onClose,
  title = "Property photos",
}: Props) {
  const { data: session, update } = useSession();
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [starred, setStarred] = useState<string[]>([]);
  const [bookmarked, setBookmarked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIndex(Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));
    setZoom(1);
  }, [open, initialIndex, images.length]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const res = await fetch("/api/account/media-prefs");
      if (!res.ok) return;
      const data = await res.json();
      setStarred(data.starredUrls || []);
      setBookmarked(data.bookmarkedUrls || []);
    })();
  }, [open, session?.user?.id]);

  const current = images[index] || "";
  const isStarred = starred.includes(current);
  const isBookmarked = bookmarked.includes(current);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!images.length) return;
      setIndex((i) => (i + dir + images.length) % images.length);
      setZoom(1);
    },
    [images.length]
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(4, z + 0.25));
      if (e.key === "-") setZoom((z) => Math.max(0.5, z - 0.25));
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, go]);

  async function toggleStar() {
    if (!current || saving) return;
    const next = isStarred
      ? starred.filter((u) => u !== current)
      : [...starred, current];
    setStarred(next);
    setSaving(true);
    await syncMediaPref({ starredUrls: next });
    setSaving(false);
    await update({});
  }

  async function toggleBookmark() {
    if (!current || saving) return;
    const next = isBookmarked
      ? bookmarked.filter((u) => u !== current)
      : [...bookmarked, current];
    setBookmarked(next);
    setSaving(true);
    await syncMediaPref({ bookmarkedUrls: next });
    setSaving(false);
    await update({});
  }

  async function downloadCurrent() {
    if (!current) return;
    try {
      const res = await fetch(current);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nova-property-${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(current, "_blank", "noopener,noreferrer");
    }
  }

  if (!open || !images.length) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex flex-col bg-[#0a0b09]/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold">{title}</p>
          <p className="text-xs text-white/60">
            {index + 1} / {images.length}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolbarBtn
            label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
          >
            −
          </ToolbarBtn>
          <span className="px-2 text-xs text-white/70 tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <ToolbarBtn
            label="Zoom in"
            onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
          >
            +
          </ToolbarBtn>
          <ToolbarBtn
            label={isStarred ? "Unstar" : "Star"}
            active={isStarred}
            onClick={() => void toggleStar()}
          >
            ★
          </ToolbarBtn>
          <ToolbarBtn
            label={isBookmarked ? "Remove bookmark" : "Bookmark"}
            active={isBookmarked}
            onClick={() => void toggleBookmark()}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 2a2 2 0 00-2 2v14l7-4 7 4V4a2 2 0 00-2-2H5z" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn label="Download" onClick={() => void downloadCurrent()}>
            ↓
          </ToolbarBtn>
          <ToolbarBtn label="Close" onClick={onClose}>
            ✕
          </ToolbarBtn>
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {images.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-3 z-10 rounded-full bg-white/10 px-3 py-2 text-lg hover:bg-white/20"
              onClick={() => go(-1)}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              type="button"
              className="absolute right-3 z-10 rounded-full bg-white/10 px-3 py-2 text-lg hover:bg-white/20"
              onClick={() => go(1)}
              aria-label="Next image"
            >
              ›
            </button>
          </>
        ) : null}

        <div className="max-h-full max-w-full overflow-auto p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt=""
            className="mx-auto max-h-[75vh] max-w-full object-contain transition-transform duration-200 origin-center"
            style={{ transform: `scale(${zoom})` }}
            draggable={false}
          />
        </div>
      </div>

      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-4 py-3">
          {images.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => {
                setIndex(i);
                setZoom(1);
              }}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded border ${
                i === index ? "border-brand" : "border-white/20"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ToolbarBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-semibold transition ${
        active
          ? "bg-brand text-[#0c0d0b]"
          : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

/** Thumbnail grid that opens ImageViewer on click */
export function ImageGallery({
  images,
  title,
  className = "",
}: {
  images: string[];
  title?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(0);

  if (!images.length) return null;

  return (
    <>
      <div className={`grid sm:grid-cols-2 gap-3 ${className}`}>
        {images.map((url, i) => (
          <button
            key={url + i}
            type="button"
            onClick={() => {
              setStart(i);
              setOpen(true);
            }}
            className="group relative overflow-hidden rounded-lg border border-border aspect-[16/10]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 text-left text-xs text-white opacity-0 transition group-hover:opacity-100">
              Open viewer
            </span>
          </button>
        ))}
      </div>
      <ImageViewer
        images={images}
        initialIndex={start}
        open={open}
        onClose={() => setOpen(false)}
        title={title}
      />
    </>
  );
}
