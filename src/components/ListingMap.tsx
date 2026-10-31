"use client";

type Props = {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number | null;
  lng?: number | null;
  title?: string;
  className?: string;
};

function buildEmbedSrc(input: Props) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY?.trim();
  const hasCoords =
    typeof input.lat === "number" &&
    Number.isFinite(input.lat) &&
    typeof input.lng === "number" &&
    Number.isFinite(input.lng);

  const query = hasCoords
    ? `${input.lat},${input.lng}`
    : [input.street, input.city, input.state, input.country || "Nigeria"]
        .filter(Boolean)
        .join(", ");

  if (!query.trim()) return null;

  if (key) {
    const params = new URLSearchParams({
      key,
      q: query,
      zoom: "15",
    });
    return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
  }

  // Keyless place embed (works for address or lat,lng)
  const params = new URLSearchParams({
    q: query,
    z: "15",
    output: "embed",
  });
  return `https://maps.google.com/maps?${params.toString()}`;
}

/** Google Map embed — only render when landlord has mapEnabled ON */
export default function ListingMap(props: Props) {
  const src = buildEmbedSrc(props);
  if (!src) return null;

  const label =
    props.title ||
    [props.street, props.city, props.state].filter(Boolean).join(", ") ||
    "Property location";

  return (
    <div
      className={`overflow-hidden border border-border bg-surface ${props.className || ""}`}
    >
      <iframe
        title={`Map — ${label}`}
        src={src}
        className="h-64 w-full border-0 sm:h-80"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <p className="border-t border-border px-3 py-2 text-xs text-muted">
        Location shown on Google Maps ·{" "}
        <a
          href={
            typeof props.lat === "number" && typeof props.lng === "number"
              ? `https://www.google.com/maps?q=${props.lat},${props.lng}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  [props.street, props.city, props.state, props.country || "Nigeria"]
                    .filter(Boolean)
                    .join(", ")
                )}`
          }
          target="_blank"
          rel="noreferrer"
          className="font-medium text-teal hover:underline"
        >
          Open in Google Maps
        </a>
      </p>
    </div>
  );
}
