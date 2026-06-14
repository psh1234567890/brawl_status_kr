import type { MetadataRoute } from "next";
import {
  getBrawlifyBrawlers,
  getBrawlifyGameModes,
  getBrawlifyMaps,
} from "../server/brawlify";

const siteUrl = "https://www.brawl-o1.site";
const lastModified = new Date("2026-06-14T00:00:00.000Z");

type SitemapEntry = MetadataRoute.Sitemap[number];

const staticRoutes: SitemapEntry[] = [
  route("", "weekly", 1),
  route("/meta", "daily", 0.9),
  route("/skins", "monthly", 0.8),
  route("/events", "hourly", 0.7),
  route("/maps", "weekly", 0.7),
  route("/gamemodes", "weekly", 0.6),
  route("/brawlers", "weekly", 0.7),
  route("/clubs", "weekly", 0.5),
  route("/rankings", "daily", 0.6),
  route("/teams", "daily", 0.6),
  route("/counters", "daily", 0.6),
  route("/status", "daily", 0.4),
  route("/about", "monthly", 0.5),
  route("/privacy", "yearly", 0.4),
  route("/terms", "yearly", 0.4),
  route("/contact", "yearly", 0.4),
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [brawlersResult, mapsResult, modesResult] = await Promise.allSettled([
    getBrawlifyBrawlers(),
    getBrawlifyMaps(),
    getBrawlifyGameModes(),
  ]);

  return [
    ...staticRoutes,
    ...entriesFromResult(brawlersResult, (item) => route(`/brawlers/${item.id}`, "weekly", 0.55)),
    ...entriesFromResult(mapsResult, (item) => route(`/maps/${item.id}`, "weekly", 0.55)),
    ...entriesFromResult(modesResult, (item) => route(`/gamemodes/${item.id}`, "weekly", 0.45)),
  ];
}

function route(
  path: string,
  changeFrequency: SitemapEntry["changeFrequency"],
  priority: number,
): SitemapEntry {
  return {
    changeFrequency,
    lastModified,
    priority,
    url: `${siteUrl}${path}`,
  };
}

function entriesFromResult<T extends { id: number | string }>(
  result: PromiseSettledResult<{ list: T[] }>,
  mapper: (item: T) => SitemapEntry,
) {
  if (result.status !== "fulfilled") return [];
  return result.value.list.filter((item) => item.id !== undefined && item.id !== null).map(mapper);
}
