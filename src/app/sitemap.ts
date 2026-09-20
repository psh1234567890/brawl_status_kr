import type { MetadataRoute } from "next";
import {
  hreflangByLocale,
  locales,
  localizedHref,
  localizedLocales,
  type Locale,
} from "../i18n/config";
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

const localizedCopies: SitemapEntry[] = localizedLocales.flatMap((locale) => [
  localizedCopy(locale, "", "weekly", 0.9),
  ...["/meta", "/rankings", "/teams", "/counters", "/status"].map((path) =>
    localizedCopy(locale, path, "daily", path === "/meta" ? 0.85 : 0.55),
  ),
]);

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
      languages: absoluteLanguageAlternates(path || "/"),
    },
  };
}

function localizedCopy(
  locale: Locale,
  basePath: string,
  changeFrequency: SitemapEntry["changeFrequency"],
  priority: number,
): SitemapEntry {
  const localizedPath = localizedHref(locale, basePath || "/");
  return {
    ...route(localizedPath === "/" ? "" : localizedPath, changeFrequency, priority),
    alternates: {
      languages: absoluteLanguageAlternates(basePath || "/"),
    },
  };
}

function absoluteLanguageAlternates(pathname: string) {
  return Object.fromEntries(
    locales.map((locale) => {
      const path = localizedHref(locale, pathname);
      return [hreflangByLocale[locale], `${siteUrl}${path === "/" ? "" : path}`];
    }),
  );
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
