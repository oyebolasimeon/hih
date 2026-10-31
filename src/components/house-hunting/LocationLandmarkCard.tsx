import Link from "next/link";
import { getLandmarkForSlug } from "@/lib/seo/nigeria-landmarks";

type Props = {
  slug: string;
  name: string;
  href: string;
  /** Compact for priority grid; full for all-states grid */
  size?: "featured" | "standard";
};

export default function LocationLandmarkCard({
  slug,
  name,
  href,
  size = "standard",
}: Props) {
  const landmark = getLandmarkForSlug(slug);
  const dual = Boolean(landmark.imageUrlSecondary);
  const tall = size === "featured";

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden border border-navy/10 bg-navy text-sand transition hover:border-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
    >
      <div className={`relative ${tall ? "aspect-[4/5] sm:aspect-[3/4]" : "aspect-[5/4]"}`}>
        {dual ? (
          <div className="absolute inset-0 grid grid-cols-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={landmark.imageUrl}
              alt=""
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
              loading="lazy"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={landmark.imageUrlSecondary}
              alt=""
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
              loading="lazy"
            />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={landmark.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/55 to-navy/10" />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <h3
          className={`font-display font-semibold tracking-tight text-white ${
            tall ? "text-xl sm:text-2xl" : "text-lg"
          }`}
        >
          {name}
        </h3>
        <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-teal">
          {landmark.monuments.join(" · ")}
        </p>
        <p className="mt-2 text-xs text-sand/70">
          House hunting · verified rentals
        </p>
      </div>
    </Link>
  );
}
