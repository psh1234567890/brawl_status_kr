"use client";

import { useMemo, useState } from "react";
import BrawlImage from "../../components/BrawlImage";
import StatSymbol from "../../components/StatSymbol";
import PortalLayout from "../../components/PortalLayout";
import styles from "./catalog.module.css";

import {
  generatedSkinCatalog,
  type GeneratedSkinCatalogItem,
} from "../../constants/generatedSkinCatalog";
import { numberLocales, type Locale } from "../../i18n/config";
import { getCatalogPageMessages } from "../../i18n/catalogPageMessages";
import { translateBrawlerName, translateSkinName } from "../../utils/brawlTranslations";
import { replaceBrowserSearch, useBrowserSearch } from "../../utils/urlState";

const PAGE_SIZE = 120;
const ALL = "ALL";

type SaleStatus = "ALL" | "CATALOG" | "UNAVAILABLE" | "DEFAULT" | "PAID";
type SortMode = "RARITY" | "NEWEST" | "NAME" | "BRAWLER" | "PRICE_DESC" | "PRICE_ASC";

const saleStatuses: SaleStatus[] = ["ALL", "CATALOG", "UNAVAILABLE", "DEFAULT", "PAID"];
const sortModes: SortMode[] = ["RARITY", "NEWEST", "NAME", "BRAWLER", "PRICE_DESC", "PRICE_ASC"];

const rarityWeight: Record<string, number> = {
  DEFAULT: 0,
  RARE: 1,
  SUPER_RARE: 2,
  EPIC: 3,
  MYTHIC: 4,
  COLLECTORS: 4,
  RANKED_PASS: 4,
  HYPERCHARGE: 5,
  LEGENDARY: 5,
};

function formatPrice(skin: GeneratedSkinCatalogItem, locale: Locale) {
  const copy = getCatalogPageMessages(locale).skins.price;
  if (skin.isDefault) return copy.defaultProvided;
  if (skin.gems > 0 && skin.bling > 0) {
    return `${skin.gems} ${copy.gems}${copy.separator}${skin.bling} ${copy.bling}`;
  }
  if (skin.gems > 0) return `${skin.gems} ${copy.gems}`;
  if (skin.bling > 0) return `${skin.bling} ${copy.bling}`;
  if (skin.coins > 0) return `${skin.coins} ${copy.coins}`;
  return skin.isCatalogReleased ? copy.acquisitionUnknown : copy.catalogUnavailable;
}

function getPriceValue(skin: GeneratedSkinCatalogItem) {
  if (skin.gems > 0) return skin.gems * 10_000;
  if (skin.bling > 0) return skin.bling;
  if (skin.coins > 0) return skin.coins / 5;
  return 0;
}

function getRarityWeight(skin: GeneratedSkinCatalogItem) {
  return rarityWeight[skin.rarity] ?? 0;
}

function isPaidSkin(skin: GeneratedSkinCatalogItem) {
  return skin.gems > 0 || skin.bling > 0 || skin.coins > 0;
}

function getSaleLabel(skin: GeneratedSkinCatalogItem, locale: Locale) {
  const copy = getCatalogPageMessages(locale).skins.saleLabel;
  if (skin.isDefault) return copy.DEFAULT;
  if (skin.isCatalogReleased) return copy.CATALOG;
  return copy.UNAVAILABLE;
}

function matchesSaleStatus(skin: GeneratedSkinCatalogItem, status: SaleStatus) {
  if (status === "ALL") return true;
  if (status === "CATALOG") return skin.isCatalogReleased && !skin.isDefault;
  if (status === "UNAVAILABLE") return !skin.isCatalogReleased;
  if (status === "DEFAULT") return skin.isDefault;
  return isPaidSkin(skin);
}

function compareSkins(
  left: GeneratedSkinCatalogItem,
  right: GeneratedSkinCatalogItem,
  sortMode: SortMode,
  locale: Locale,
) {
  const localeName = numberLocales[locale];
  const leftSkinName = translateSkinName(left.id, left.name, locale);
  const rightSkinName = translateSkinName(right.id, right.name, locale);
  const leftBrawlerName = translateBrawlerName(left.brawlerName, locale);
  const rightBrawlerName = translateBrawlerName(right.brawlerName, locale);
  if (sortMode === "NAME") {
    return leftSkinName.localeCompare(rightSkinName, localeName) || left.id - right.id;
  }

  if (sortMode === "BRAWLER") {
    return (
      leftBrawlerName.localeCompare(rightBrawlerName, localeName) ||
      leftSkinName.localeCompare(rightSkinName, localeName) ||
      left.id - right.id
    );
  }

  if (sortMode === "PRICE_DESC") {
    return getPriceValue(right) - getPriceValue(left) || right.id - left.id;
  }

  if (sortMode === "PRICE_ASC") {
    return getPriceValue(left) - getPriceValue(right) || left.id - right.id;
  }

  if (sortMode === "NEWEST") {
    return right.id - left.id;
  }

  return getRarityWeight(right) - getRarityWeight(left) || right.id - left.id;
}

export default function SkinCatalogPage({ locale = "ko" }: { locale?: Locale }) {
  const copy = getCatalogPageMessages(locale).skins;
  const unitGap = locale === "ko" || locale === "ja" ? "" : " ";
  const search = useBrowserSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const query = params.get("q") ?? "";
  const requestedBrawler = params.get("brawler");
  const brawlerId =
    requestedBrawler &&
    generatedSkinCatalog.some((skin) => String(skin.brawlerId) === requestedBrawler)
      ? requestedBrawler
      : ALL;
  const requestedRarity = params.get("rarity");
  const rarity =
    requestedRarity && generatedSkinCatalog.some((skin) => skin.rarity === requestedRarity)
      ? requestedRarity
      : ALL;
  const requestedSale = params.get("sale") as SaleStatus | null;
  const saleStatus = requestedSale && saleStatuses.includes(requestedSale) ? requestedSale : "ALL";
  const requestedSort = params.get("sort") as SortMode | null;
  const sortMode = requestedSort && sortModes.includes(requestedSort) ? requestedSort : "RARITY";
  const hideDefaults = params.get("defaults") !== "show";
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const brawlers = useMemo(() => {
    const byId = new Map<number, string>();
    for (const skin of generatedSkinCatalog) {
      byId.set(skin.brawlerId, translateBrawlerName(skin.brawlerName, locale));
    }
    return [...byId.entries()].sort(([, left], [, right]) =>
      left.localeCompare(right, numberLocales[locale]),
    );
  }, [locale]);

  const rarities = useMemo(
    () =>
      [...new Set(generatedSkinCatalog.map((skin) => skin.rarity))].sort(
        (left, right) => (rarityWeight[right] ?? 0) - (rarityWeight[left] ?? 0),
      ),
    [],
  );

  const filteredSkins = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return generatedSkinCatalog
      .filter((skin) => {
        const localizedSkinName = translateSkinName(skin.id, skin.name, locale).toLowerCase();
        const localizedBrawlerName = translateBrawlerName(skin.brawlerName, locale).toLowerCase();
        const matchesQuery =
          cleanQuery === "" ||
          localizedSkinName.includes(cleanQuery) ||
          localizedBrawlerName.includes(cleanQuery) ||
          skin.name.toLowerCase().includes(cleanQuery) ||
          skin.brawlerName.toLowerCase().includes(cleanQuery) ||
          skin.brawlerNameKo.toLowerCase().includes(cleanQuery);
        const matchesRarity = rarity === ALL || skin.rarity === rarity;
        const matchesBrawler = brawlerId === ALL || String(skin.brawlerId) === brawlerId;
        const matchesStatus = matchesSaleStatus(skin, saleStatus);
        const matchesDefaultVisibility = !hideDefaults || !skin.isDefault;
        return matchesQuery && matchesRarity && matchesBrawler && matchesStatus && matchesDefaultVisibility;
      })
      .sort((left, right) => compareSkins(left, right, sortMode, locale));
  }, [brawlerId, hideDefaults, locale, query, rarity, saleStatus, sortMode]);

  const summary = useMemo(() => {
    let catalog = 0;
    let unavailable = 0;
    let defaults = 0;
    let paid = 0;

    for (const skin of filteredSkins) {
      if (skin.isCatalogReleased && !skin.isDefault) catalog += 1;
      if (!skin.isCatalogReleased) unavailable += 1;
      if (skin.isDefault) defaults += 1;
      if (isPaidSkin(skin)) paid += 1;
    }

    return {
      catalog,
      defaults,
      paid,
      total: filteredSkins.length,
      unavailable,
    };
  }, [filteredSkins]);

  const visibleSkins = filteredSkins.slice(0, visibleCount);

  function resetVisibleCount() {
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <PortalLayout locale={locale} title={copy.title}
      description={`${copy.catalogCountPrefix} ${generatedSkinCatalog.length.toLocaleString(numberLocales[locale])}${unitGap}${copy.catalogCountUnit}`}>
        <section className={styles.filters}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
            <input
              type="search"
              aria-label={copy.searchAria}
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                resetVisibleCount();
                replaceBrowserSearch({ q: value || null });
              }}
              placeholder={copy.searchPlaceholder}
              className={styles.control}
            />
            <select
              aria-label={copy.brawlerAria}
              value={brawlerId}
              onChange={(event) => {
                const value = event.target.value;
                resetVisibleCount();
                replaceBrowserSearch({ brawler: value === ALL ? null : value });
              }}
              className={styles.control}
            >
              <option value={ALL}>{copy.allBrawlers}</option>
              {brawlers.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <select
              aria-label={copy.rarityAria}
              value={rarity}
              onChange={(event) => {
                const value = event.target.value;
                resetVisibleCount();
                replaceBrowserSearch({ rarity: value === ALL ? null : value });
              }}
              className={styles.control}
            >
              <option value={ALL}>{copy.rarity.ALL}</option>
              {rarities.map((value) => (
                <option key={value} value={value}>
                  {copy.rarity[value as keyof typeof copy.rarity] ?? value}
                </option>
              ))}
            </select>
            <select
              aria-label={copy.saleAria}
              value={saleStatus}
              onChange={(event) => {
                const value = event.target.value as SaleStatus;
                resetVisibleCount();
                replaceBrowserSearch({ sale: value === "ALL" ? null : value });
              }}
              className={styles.control}
            >
              {saleStatuses.map((value) => (
                <option key={value} value={value}>
                  {copy.saleFilter[value]}
                </option>
              ))}
            </select>
            <select
              aria-label={copy.sortAria}
              value={sortMode}
              onChange={(event) => {
                const value = event.target.value as SortMode;
                resetVisibleCount();
                replaceBrowserSearch({ sort: value === "RARITY" ? null : value });
              }}
              className={styles.control}
            >
              {sortModes.map((value) => (
                <option key={value} value={value}>
                  {copy.sort[value]}
                </option>
              ))}
            </select>
          </div>

          <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={hideDefaults}
              onChange={(event) => {
                const checked = event.target.checked;
                resetVisibleCount();
                replaceBrowserSearch({ defaults: checked ? null : "show" });
              }}
              className="h-4 w-4 accent-blue-600"
            />
            {copy.hideDefaults}
          </label>
        </section>

        <section className={styles.summary}>
          <StatChip label={copy.stats.results} value={summary.total} locale={locale} />
          <StatChip label={copy.stats.onSale} value={summary.catalog} locale={locale} />
          <StatChip label={copy.stats.unavailable} value={summary.unavailable} locale={locale} />
          <StatChip label={copy.stats.paid} value={summary.paid} locale={locale} />
          <StatChip label={copy.stats.defaults} value={summary.defaults} locale={locale} />
        </section>

        <div className={styles.listHeading}>
          <p>{visibleSkins.length.toLocaleString(numberLocales[locale])}{unitGap}{copy.shownUnit}</p>
          <p>{copy.imageFallbackTitle}</p>
        </div>

        <div className={styles.grid}>
          {visibleSkins.map((skin) => {
            const displaySkinName = translateSkinName(skin.id, skin.name, locale);
            const displayBrawlerName = translateBrawlerName(skin.brawlerName, locale);
            return (
            <article
              key={skin.id}
              className={styles.skin}
            >
              <div className={styles.art}>
                <span className={styles.skinId}>
                  #{skin.id}
                </span>
                <BrawlImage
                  src={`https://cdn.brawlify.com/brawlers/borders/${skin.brawlerId}.png`}
                  alt={displayBrawlerName}
                  width={112}
                  height={112}
                  sizes="112px"
                  className="h-24 w-24 rounded-lg object-contain sm:h-28 sm:w-28"
                  title={copy.imageFallbackTitle}
                />
              </div>
              <div className={styles.info}>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700">
                    <StatSymbol kind="star" size={12} />
                    {copy.rarity[skin.rarity as keyof typeof copy.rarity] ?? skin.rarity}
                  </span>
                  <span
                    className={`text-[11px] font-semibold ${
                      skin.isCatalogReleased
                        ? "text-emerald-700"
                        : "text-slate-500"
                    }`}
                  >
                    {getSaleLabel(skin, locale)}
                  </span>
                </div>
                <h2 className="text-sm font-extrabold leading-5 text-slate-900 sm:text-base" title={displaySkinName}>
                  {displaySkinName}
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-500">{displayBrawlerName}</p>
                <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-800 sm:text-sm">
                  {skin.gems > 0 ? <StatSymbol kind="gem" size={15} className="text-emerald-600" /> : null}
                  {skin.bling > 0 ? <StatSymbol kind="bling" size={15} className="text-amber-600" /> : null}
                  {skin.coins > 0 ? <StatSymbol kind="coin" size={15} className="text-amber-600" /> : null}
                  {!isPaidSkin(skin) ? <StatSymbol kind="skin" size={15} className="text-blue-600" /> : null}
                  {formatPrice(skin, locale)}
                </p>
              </div>
            </article>
            );
          })}
        </div>

        {filteredSkins.length === 0 ? (
          <p role="status" className="border-y border-slate-200 py-10 text-center text-sm text-slate-500">
            {copy.empty}
          </p>
        ) : null}

        {visibleCount < filteredSkins.length ? (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="min-h-12 rounded-lg bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {copy.more}
            </button>
          </div>
        ) : null}
    </PortalLayout>
  );
}

function StatChip({ label, value, locale }: { label: string; value: number; locale: Locale }) {
  return (
    <div>
      <p>{label}</p>
      <strong>{value.toLocaleString(numberLocales[locale])}</strong>
    </div>
  );
}
