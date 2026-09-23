"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { localizedHref, numberLocales, type Locale } from "../i18n/config";
import { getCatalogPageMessages } from "../i18n/catalogPageMessages";
import {
  formatMapResultCount,
  getMapBrowserMessages,
} from "../i18n/mapBrowserMessages";
import { translateMapName, translateModeName } from "../utils/brawlTranslations";
import BrawlImage from "./BrawlImage";

const PAGE_SIZE = 48;

export type MapBrowserItem = {
  id: number;
  name: string;
  imageUrl?: string;
  lastActive?: number;
  gameModeName?: string;
};

export default function MapsBrowser({
  maps,
  locale,
}: {
  maps: MapBrowserItem[];
  locale: Locale;
}) {
  const copy = getMapBrowserMessages(locale);
  const catalogCopy = getCatalogPageMessages(locale).maps.list;
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const modes = useMemo(() => {
    const values = maps
      .map((map) => map.gameModeName)
      .filter((value): value is string => Boolean(value));
    return [...new Set(values)].sort((left, right) =>
      translateModeName(left, locale).localeCompare(
        translateModeName(right, locale),
        numberLocales[locale],
      ),
    );
  }, [locale, maps]);

  const filteredMaps = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(numberLocales[locale]);

    return maps.filter((map) => {
      if (mode && map.gameModeName !== mode) return false;
      if (!normalizedQuery) return true;

      const displayName = translateMapName(map.name, locale).toLocaleLowerCase(
        numberLocales[locale],
      );
      const rawName = map.name.toLowerCase();
      return displayName.includes(normalizedQuery) || rawName.includes(normalizedQuery);
    });
  }, [locale, maps, mode, query]);

  const visibleMaps = filteredMaps.slice(0, visibleCount);

  function updateQuery(value: string) {
    setQuery(value);
    setVisibleCount(PAGE_SIZE);
  }

  function updateMode(value: string) {
    setMode(value);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_240px_auto] md:items-center">
        <label className="sr-only" htmlFor="map-search">
          {copy.searchAria}
        </label>
        <input
          id="map-search"
          type="search"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder={copy.searchPlaceholder}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />

        <label className="sr-only" htmlFor="map-mode-filter">
          {copy.modeFilterAria}
        </label>
        <select
          id="map-mode-filter"
          value={mode}
          onChange={(event) => updateMode(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">{copy.allModes}</option>
          {modes.map((modeName) => (
            <option key={modeName} value={modeName}>
              {translateModeName(modeName, locale)}
            </option>
          ))}
        </select>

        <p className="text-sm font-black text-slate-500 md:text-right" aria-live="polite">
          {formatMapResultCount(locale, filteredMaps.length)}
        </p>
      </section>

      {visibleMaps.length ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleMaps.map((map, index) => {
            const displayName = translateMapName(map.name, locale);
            const displayMode =
              translateModeName(map.gameModeName, locale) || catalogCopy.other;

            return (
              <article
                key={map.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                {map.imageUrl ? (
                  <BrawlImage
                    src={map.imageUrl}
                    alt={displayName}
                    width={500}
                    height={260}
                    loading={index === 0 ? "eager" : "lazy"}
                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
                    className="h-36 w-full object-cover"
                    fallbackText={displayName.slice(0, 1)}
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center bg-blue-50 text-3xl font-black text-blue-200">
                    {displayName.slice(0, 1)}
                  </div>
                )}

                <div className="p-4">
                  <p className="text-xs font-black uppercase tracking-[0.06em] text-blue-600">
                    {displayMode}
                  </p>
                  <h2
                    className="mt-1 truncate text-lg font-black text-slate-950"
                    title={displayName}
                  >
                    {displayName}
                  </h2>
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    {catalogCopy.recentActive}: {formatUnixDate(map.lastActive, locale)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={localizedHref(locale, "/maps/" + map.id)}
                      className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                      {catalogCopy.detailView}
                    </Link>
                    <Link
                      href={
                        localizedHref(locale, "/meta") +
                        "?map=" +
                        encodeURIComponent(map.name)
                      }
                      className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {copy.recommendation}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div
          role="status"
          className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500"
        >
          {copy.noResults}
        </div>
      )}

      {visibleCount < filteredMaps.length ? (
        <button
          type="button"
          onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
          className="mx-auto inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
          {copy.loadMore}
        </button>
      ) : null}
    </div>
  );
}

function formatUnixDate(value: number | undefined, locale: Locale) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(numberLocales[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value * 1000));
}
