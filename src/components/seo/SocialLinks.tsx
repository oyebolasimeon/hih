import { SITE_SOCIAL } from "@/lib/seo/site";

type Props = {
  className?: string;
  invert?: boolean;
};

const LINKS: Array<{ key: keyof typeof SITE_SOCIAL; label: string }> = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "twitter", label: "X" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
];

export default function SocialLinks({ className = "", invert = false }: Props) {
  const linkClass = invert
    ? "text-sand/70 hover:text-teal transition-colors"
    : "text-navy/70 hover:text-teal-dark transition-colors";

  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-2 ${className}`}>
      {LINKS.map(({ key, label }) => (
        <li key={key}>
          <a
            href={SITE_SOCIAL[key]}
            target="_blank"
            rel="noopener noreferrer me"
            className={`text-sm font-medium ${linkClass}`}
          >
            {label}
          </a>
        </li>
      ))}
    </ul>
  );
}
