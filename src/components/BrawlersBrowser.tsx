"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { localizedHref, numberLocales, type Locale } from "../i18n/config";
import { getCatalogPageMessages } from "../i18n/catalogPageMessages";
import {
  formatBrawlerResultCount,
  getBrawlerBrowserMessages,
} from "../i18n/brawlerBrowserMessages";
import {
  translateBrawlerClassName,
  translateBrawlerDescription,
  translateBrawlerName,
  translateRarityName,
} from "../utils/brawlTranslations";
import BrawlImage from "./BrawlImage";

export type BrawlerBrowserItem = {
  id: number;
  name: string;
  imageUrl?: string;
  description?: string;
  rarityName?: string;
  className?: string;
};

export default function BrawlersBrowser({
  brawlers,
  locale,
}: {
  brawlers: BrawlerBrowserItem[];
  locale: Locale;
}) {
  const browserCopy = getBrawlerBrowserMessages(locale);
  const catalogCopy = getCatalogPageMessages(locale).brawlers.list;
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("");
  const [className, setClassName] = useState("");

  const rarities = useMemo(
    () =>
      [...new Set(brawlers.map((brawler) => brawler.rarityName).filter(Boolean) as string[])]
        .sort((left, right) =>
          translateRarityName(left, locale).localeCompare(
            translateRarityName(right, locale),
            numberLocales[locale],
          ),
        ),
    [brawlers, locale],
  );

  const classes = useMemo(
    () =>
      [...new Set(brawlers.map((brawler) => brawler.className).filter(Boolean) as string[])]
        .sort((left, right) =>
          translateBrawlerClassName(left, locale).localeCompare(
            translateBrawlerClassName(right, locale),
            numberLocales[locale],
          ),
        ),
    [brawlers, locale],
  );

  const filteredBrawlers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(numberLocales[locale]);

    return brawlers.filter((brawler) => {
      if (rarity && brawler.rarityName !== rarity) return false;
      if (className && brawler.className !== className) return false;
      if (!normalizedQuery) return true;

      const localizedName = translateBrawlerName(brawler.name, locale).toLocaleLowerCase(
        numberLocales[locale],
      );
      const rawName = brawler.name.toLowerCase();
      return localizedName.includes(normalizedQuery) || rawName.includes(normalizedQuery);
    });
  }, [brawlers, className, locale, query, rarity]);

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_190px_190px_auto] md:items-center">
        <label className="sr-only" htmlFor="brawler-search">
          {browserCopy.searchAria}
        </label>
        <input
          id="brawler-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={browserCopy.searchPlaceholder}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />

        <label className="sr-only" htmlFor="brawler-rarity-filter">
          {browserCopy.rarityFilterAria}
        </label>
        <select
          id="brawler-rarity-filter"
          value={rarity}
          onChange={(event) => setRarity(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">{browserCopy.allRarities}</option>
          {rarities.map((rarityName) => (
            <option key={rarityName} value={rarityName}>
              {translateRarityName(rarityName, locale)}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="brawler-class-filter">
          {browserCopy.classFilterAria}
        </label>
        <select
          id="brawler-class-filter"
          value={className}
          onChange={(event) => setClassName(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">{browserCopy.allClasses}</option>
          {classes.map((value) => (
            <option key={value} value={value}>
              {translateBrawlerClassName(value, locale)}
            </option>
          ))}
        </select>

        <p className="text-sm font-black text-slate-500 md:text-right" aria-live="polite">
          {formatBrawlerResultCount(locale, filteredBrawlers.length)}
        </p>
      </section>

      {filteredBrawlers.length ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBrawlers.map((brawler, index) => {
            const displayName = translateBrawlerName(brawler.name, locale);
            const description = translateBrawlerDescription(
              brawler.name,
              brawler.description,
              locale,
            );

            return (
              <article
                key={brawler.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <BrawlImage
                    src={
                      brawler.imageUrl ??
                      "https://cdn.brawlify.com/brawlers/borders/" + brawler.id + ".png"
                    }
                    alt={displayName}
                    width={72}
                    height={72}
                    loading={index < 4 ? "eager" : "lazy"}
                    sizes="64px"
                    className="h-16 w-16 shrink-0 rounded-md bg-blue-50 object-contain"
                    fallbackText={displayName.slice(0, 1)}
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-black text-slate-900">
                      {displayName}
                    </h2>
                    <p className="text-xs font-bold text-blue-600">
                      {translateRarityName(brawler.rarityName, locale) || catalogCopy.unknown}
                    </p>
                    <p className="text-xs font-bold text-slate-400">
                      {translateBrawlerClassName(brawler.className, locale) || "-"}
                    </p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-slate-500">
                  {description || catalogCopy.noDescription}
                </p>
                <Link
                  href={localizedHref(locale, "/brawlers/" + brawler.id)}
                  className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  {catalogCopy.detailView}
                </Link>
              </article>
            );
          })}
        </section>
      ) : (
        <div
          role="status"
          className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500"
        >
          {browserCopy.noResults}
        </div>
      )}
    </div>
  );
}
