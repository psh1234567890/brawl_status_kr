import type { MetadataRoute } from "next";

const siteUrl = "https://www.brawl-o1.site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-06-14T00:00:00.000Z");

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
    {
      url: `${siteUrl}/events`,
      lastModified,
      changeFrequency: "hourly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/maps`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/gamemodes`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/brawlers`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/clubs`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/rankings`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/teams`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/counters`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/status`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
