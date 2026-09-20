import type { MetadataRoute } from "next";
import {
  getBrawlifyBrawlers,
  getBrawlifyGameModes,
  getBrawlifyMaps,
} from "../server/brawlify";
import {
  selectIndexableBrawlers,
  selectIndexableGameModes,
  selectIndexableMaps,
} from "../utils/seoIndexing";

const siteUrl = "https://www.brawl-o1.site";

type SitemapEntry = MetadataRoute.Sitemap[number];

const staticRoutes: SitemapEntry[] = [
  localizedRoute("", "weekly", 1),
  localizedRoute("/meta", "daily", 0.9),
  route("/skins", "monthly", 0.8),
  route("/events", "hourly", 0.7),
  route("/maps", "weekly", 0.7),
  route("/gamemodes", "weekly", 0.6),
  route("/brawlers", "weekly", 0.7),
  route("/clubs", "weekly", 0.5),
  localizedRoute("/rankings", "daily", 0.6),
  localizedRoute("/teams", "daily", 0.6),
  localizedRoute("/counters", "daily", 0.6),
  localizedRoute("/status", "daily", 0.4),
  route("/methodology", "monthly", 0.5),
  route("/about", "monthly", 0.5),
  route("/privacy", "yearly", 0.4),
  route("/terms", "yearly", 0.4),
  route("/contact", "yearly", 0.4),
];

const localizedCopies: SitemapEntry[] = [
  localizedCopy("/en", "weekly", 0.9, ""),
  localizedCopy("/ja", "weekly", 0.9, ""),
  ...["/meta", "/rankings", "/teams", "/counters", "/status"].flatMap((path) => [
    localizedCopy(`/en${path}`, "daily", path === "/meta" ? 0.85 : 0.55, path),
    localizedCopy(`/ja${path}`, "daily", path === "/meta" ? 0.85 : 0.55, path),
  ]),
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [brawlersResult, mapsResult, modesResult] = await Promise.allSettled([
    getBrawlifyBrawlers(),
    getBrawlifyMaps(),
    getBrawlifyGameModes(),
  ]);

  return [
    ...staticRoutes,
    ...localizedCopies,
    ...entriesFromResult(
      brawlersResult,
      selectIndexableBrawlers,
      (item) => route(`/brawlers/${item.id}`, "weekly", 0.55),
    ),
    ...entriesFromResult(
      mapsResult,
      selectIndexableMaps,
      (item) => route(`/maps/${item.id}`, "weekly", 0.55),
    ),
    ...entriesFromResult(
      modesResult,
      selectIndexableGameModes,
      (item) => route(`/gamemodes/${item.id}`, "weekly", 0.45),
    ),
  ];
}

function localizedRoute(
  path: string,
  changeFrequency: SitemapEntry["changeFrequency"],
  priority: number,
): SitemapEntry {
  return {
    ...route(path, changeFrequency, priority),
    alternates: {
      languages: {
        "ko-KR": `${siteUrl}${path}`,
        en: `${siteUrl}/en${path}`,
        ja: `${siteUrl}/ja${path}`,
      },
    },
  };
}

function localizedCopy(
  path: string,
  changeFrequency: SitemapEntry["changeFrequency"],
  priority: number,
  basePath: string,
): SitemapEntry {
  return {
    ...route(path, changeFrequency, priority),
    alternates: {
      languages: {
        "ko-KR": `${siteUrl}${basePath}`,
        en: `${siteUrl}/en${basePath}`,
        ja: `${siteUrl}/ja${basePath}`,
      },
    },
  };
}

function route(
  path: string,
  changeFrequency: SitemapEntry["changeFrequency"],
  priority: number,
): SitemapEntry {
  return {
    changeFrequency,
    priority,
    url: `${siteUrl}${path}`,
  };
}

function entriesFromResult<T extends { id: number | string }>(
  result: PromiseSettledResult<{ list: T[] }>,
  selector: (items: T[]) => T[],
  mapper: (item: T) => SitemapEntry,
) {
  if (result.status !== "fulfilled") return [];
  return selector(
    result.value.list.filter((item) => item.id !== undefined && item.id !== null),
  ).map(mapper);
}
