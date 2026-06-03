import type { MetadataRoute } from "next";

const siteUrl = "https://www.brawl-o1.site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-06-04T00:00:00.000Z");

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/meta`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/skins`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
