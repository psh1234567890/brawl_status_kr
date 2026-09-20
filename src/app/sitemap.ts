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

const localizedStaticConfig: Array<
  [string, SitemapEntry["changeFrequency"], number]
> = [
  ["", "weekly", 1],
  ["/meta", "daily", 0.9],
  ["/skins", "monthly", 0.8],
  ["/events", "hourly", 0.7],
  ["/maps", "weekly", 0.7],
  ["/gamemodes", "weekly", 0.6],
  ["/brawlers", "weekly", 0.7],
  ["/clubs", "weekly", 0.5],
  ["/rankings", "daily", 0.6],
  ["/teams", "daily", 0.6],
  ["/counters", "daily", 0.6],
  ["/status", "daily", 0.4],
  ["/methodology", "monthly", 0.5],
  ["/about", "monthly", 0.5],
  ["/privacy", "yearly", 0.4],
  ["/terms", "yearly", 0.4],
  ["/contact", "yearly", 0.4],
];

const staticRoutes: SitemapEntry[] = localizedStaticConfig.map(
  ([path, changeFrequency, priority]) => localizedRoute(path, changeFrequency, priority),
);

const localizedCopies: SitemapEntry[] = localizedLocales.flatMap((locale) =>
  localizedStaticConfig.map(([path, changeFrequency, priority]) =>
    localizedCopy(locale, path, changeFrequency, Math.max(0.3, priority - 0.05)),
  ),
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [brawlersResult, mapsResult, modesResult] = await Promise.allSettled([
    getBrawlifyBrawlers(),
    getBrawlifyMaps(),
    getBrawlifyGameModes(),
  ]);

  return [
    ...staticRoutes,
    ...localizedCopies,
    ...localizedEntriesFromResult(
      brawlersResult,
      selectIndexableBrawlers,
      (item) => `/brawlers/${item.id}`,
      "weekly",
      0.55,
    ),
    ...localizedEntriesFromResult(
      mapsResult,
      selectIndexableMaps,
      (item) => `/maps/${item.id}`,
      "weekly",
      0.55,
    ),
    ...localizedEntriesFromResult(
      modesResult,
      selectIndexableGameModes,
      (item) => `/gamemodes/${item.id}`,
      "weekly",
      0.45,
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

function localizedEntriesFromResult<T extends { id: number | string }>(
  result: PromiseSettledResult<{ list: T[] }>,
  selector: (items: T[]) => T[],
  pathFor: (item: T) => string,
  changeFrequency: SitemapEntry["changeFrequency"],
  priority: number,
) {
  if (result.status !== "fulfilled") return [];
  return selector(result.value.list.filter((item) => item.id !== undefined && item.id !== null)).flatMap(
    (item) => {
      const path = pathFor(item);
      return [
        localizedRoute(path, changeFrequency, priority),
        ...localizedLocales.map((locale) =>
          localizedCopy(locale, path, changeFrequency, Math.max(0.3, priority - 0.05)),
        ),
      ];
    },
  );
}
