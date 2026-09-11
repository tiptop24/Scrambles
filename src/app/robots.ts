import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Pool pages are invite-only by a private link, not a secret, but there's no
// reason for search engines to crawl and index someone else's private pool —
// only the homepage is meant for organic discovery.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/pool/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
