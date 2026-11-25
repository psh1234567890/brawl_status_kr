import type { MetadataRoute } from "next";

const siteUrl = "https://www.brawl-o1.site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    ...(process.env.NEXT_PUBLIC_BRAWLOOP_STAGING === "1" ? {} : {
      sitemap: `${siteUrl}/sitemap.xml`,
      host: siteUrl,
    }),
  };
}
