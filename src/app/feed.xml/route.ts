import { connectDB } from "@/lib/db";
import { BlogPost } from "@/models/BlogPost";
import { Listing } from "@/models/Listing";
import { getSiteUrl, SITE_NAME, SITE_TAGLINE } from "@/lib/seo/site";

export const revalidate = 3600;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const base = getSiteUrl();
  const now = new Date().toUTCString();

  let items = "";

  try {
    await connectDB();
    const [posts, listings] = await Promise.all([
      BlogPost.find({ status: "published" })
        .sort({ publishedAt: -1 })
        .limit(40)
        .select("title slug excerpt publishedAt updatedAt")
        .lean(),
      Listing.find({
        availabilityStatus: { $in: ["available", "pending"] },
        verificationStatus: "verified",
      })
        .sort({ publishedAt: -1 })
        .limit(60)
        .select("title _id description address publishedAt updatedAt")
        .lean(),
    ]);

    items += posts
      .map((p) => {
        const link = `${base}/blog/${p.slug}`;
        const date = (p.publishedAt || p.updatedAt || new Date()).toUTCString();
        return `<item>
  <title>${escapeXml(p.title)}</title>
  <link>${link}</link>
  <guid isPermaLink="true">${link}</guid>
  <pubDate>${date}</pubDate>
  <description>${escapeXml(p.excerpt || p.title)}</description>
</item>`;
      })
      .join("\n");

    items += listings
      .map((l) => {
        const link = `${base}/listings/${String(l._id)}`;
        const loc = [l.address?.city, l.address?.state].filter(Boolean).join(", ");
        const title = `${l.title}${loc ? ` — ${loc}` : ""}`;
        const date = (l.publishedAt || l.updatedAt || new Date()).toUTCString();
        const desc = (l.description || title).slice(0, 280);
        return `<item>
  <title>${escapeXml(title)}</title>
  <link>${link}</link>
  <guid isPermaLink="true">${link}</guid>
  <pubDate>${date}</pubDate>
  <description>${escapeXml(desc)}</description>
  <category>listing</category>
</item>`;
      })
      .join("\n");
  } catch (err) {
    console.warn("feed.xml unavailable:", err);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)} — ${escapeXml(SITE_TAGLINE)}</title>
    <link>${base}</link>
    <description>House hunting, verified rentals and property stories across Nigeria — Lagos, Abuja, Ogun, Oyo and every state.</description>
    <language>en-ng</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
