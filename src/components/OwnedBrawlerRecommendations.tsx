"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import type { PlayerData } from "../types/brawl";
import { localizedHref, numberLocales, type Locale } from "../i18n/config";
import { getPersonalizedMetaMessages } from "../i18n/personalizedMetaMessages";
import { getComponentMessages } from "../i18n/componentMessages";
import { recommendationFreshnessMessages } from "../i18n/recommendationFreshnessMessages";
import { useAccount } from "../hooks/useAccount";
import { isValidPlayerTag, normalizePlayerTag } from "../utils/playerTag";
import { translateBrawlerName } from "../utils/brawlTranslations";
import { replaceBrowserSearch, useBrowserSearch } from "../utils/urlState";
import BrawlImage from "./BrawlImage";
import StatSymbol from "./StatSymbol";
import styles from "./OwnedBrawlerRecommendations.module.css";

const RECENT_TAGS_KEY = "recentTags";
const RECENT_TAGS_CHANGED_EVENT = "recentTagsChanged";

export type OwnedRecommendationStat = {
  id?: number;
  name: string;
  score: number;
  winRate: number;
  plays: number;
  recentPlays?: number;
};

type OwnedBrawler = PlayerData["brawlers"][number];

function getRecentTagSnapshot() {
  if (typeof window === "undefined") return "";
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_TAGS_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) && typeof parsed[0] === "string"
      ? parsed[0].trim().replace(/^#/, "").toUpperCase()
      : "";
  } catch {
    return "";
  }
}

function subscribeRecentTag(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(RECENT_TAGS_CHANGED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(RECENT_TAGS_CHANGED_EVENT, onStoreChange);
  };
}

export default function OwnedBrawlerRecommendations({
  locale,
  stats,
  selectedTag,
}: {
  locale: Locale;
  stats: OwnedRecommendationStat[];
  selectedTag?: string | null;
}) {
  const copy = getPersonalizedMetaMessages(locale);
  const freshnessCopy = recommendationFreshnessMessages[locale];
  const listId = useId();
  const search = useBrowserSearch();
  const requestedPower = new URLSearchParams(search).get("ownedPower");
  const powerFilter = requestedPower === "9" || requestedPower === "11" ? Number(requestedPower) : 0;
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const account = useAccount();
  const recentTag = useSyncExternalStore(
    subscribeRecentTag,
    getRecentTagSnapshot,
    () => "",
  );
  const explicitTag = normalizePlayerTag(selectedTag ?? "");
  const defaultTag = account.status === "account"
    ? normalizePlayerTag(account.account?.defaultPlayerTag ?? "")
    : "";
  const normalizedRecentTag = normalizePlayerTag(recentTag);
  const activeTag = isValidPlayerTag(explicitTag)
    ? explicitTag
    : isValidPlayerTag(defaultTag)
      ? defaultTag
      : isValidPlayerTag(normalizedRecentTag)
        ? normalizedRecentTag
        : "";
  const activeSource = isValidPlayerTag(explicitTag)
    ? "selected"
    : isValidPlayerTag(defaultTag)
      ? "default"
      : isValidPlayerTag(normalizedRecentTag)
        ? "recent"
        : null;
  const [lookup, setLookup] = useState<{
    tag: string;
    player: PlayerData | null;
    failed: boolean;
  }>({ tag: "", player: null, failed: false });

  useEffect(() => {
    if (!activeTag) return;

    const controller = new AbortController();

    fetch("/api/player?tag=" + encodeURIComponent(activeTag), {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("player lookup failed");
        return (await response.json()) as PlayerData;
      })
      .then((data) => setLookup({ tag: activeTag, player: data, failed: false }))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLookup({ tag: activeTag, player: null, failed: true });
      });

    return () => controller.abort();
  }, [activeTag]);

  const player = lookup.tag === activeTag ? lookup.player : null;
  const failed = lookup.tag === activeTag && lookup.failed;
  const loading = Boolean(activeTag) && lookup.tag !== activeTag;

  const ownedRecommendations = useMemo(() => {
    if (!player) return [];

    const ownedByName = new Map(
      player.brawlers.map((brawler) => [brawler.name.toUpperCase(), brawler]),
    );

    return stats
      .map((stat) => {
        const owned = ownedByName.get(stat.name.toUpperCase());
        return owned ? { stat, owned } : null;
      })
      .filter(
        (value): value is { stat: OwnedRecommendationStat; owned: OwnedBrawler } =>
          value !== null && (powerFilter === 0 ||
            (powerFilter === 11 ? value.owned.power === 11 : value.owned.power >= 9)),
      );
  }, [player, stats, powerFilter]);
  const contextKey = `${activeTag}:${search}`;
  const expanded = expandedFor === contextKey;
  const visibleRecommendations = expanded ? ownedRecommendations : ownedRecommendations.slice(0, 5);

  function selectPower(value: string) {
    setExpandedFor(null);
    replaceBrowserSearch({ ownedPower: value === "0" ? null : value });
  }

  return (
    <section aria-label={copy.title} className={`${styles.section} mb-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5`}>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-black text-blue-950 sm:text-lg">{copy.title}</h3>
          {activeTag ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 shadow-sm">
                {player ? player.name + " · " : ""}#{activeTag}
              </span>
              {activeSource ? <span className="text-xs font-bold text-blue-800">{copy.sourceLabels[activeSource]}</span> : null}
            </div>
          ) : null}
        </div>
        <p className="text-xs font-bold leading-5 text-blue-700/70 sm:text-sm">
          {copy.description}
        </p>
      </div>

      {player?.dataFreshness?.status === "stale" ? (
        <p role="status" className="mt-3 text-sm font-bold text-amber-800">
          {getComponentMessages(locale).searchErrors.staleNotice}
        </p>
      ) : null}

      {player ? <div className={styles.controls}>
        <label className={styles.powerFilter}>
          <span>{copy.powerFilter}</span>
          <select value={powerFilter} onChange={(event) => selectPower(event.target.value)}>
            <option value="0">{copy.powerAll}</option>
            <option value="9">{copy.powerNine}</option>
            <option value="11">{copy.powerEleven}</option>
          </select>
        </label>
        <p className={styles.note}>{copy.powerNote}</p>
      </div> : null}

      {!activeTag ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4">
          <p className="text-sm font-bold text-slate-600">{copy.noPlayer}</p>
          <Link
            href={localizedHref(locale, "/")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700"
          >
            {copy.searchPlayer}
          </Link>
        </div>
      ) : loading ? (
        <p role="status" className="mt-4 rounded-lg bg-white p-4 text-sm font-bold text-slate-500">
          {copy.loading}
        </p>
      ) : failed ? (
        <p role="status" className="mt-4 rounded-lg bg-white p-4 text-sm font-bold text-slate-500">
          {copy.unavailable}
        </p>
      ) : ownedRecommendations.length ? (
        <>
        <ol id={listId} className={`${styles.list} ${expanded ? "" : styles.collapsed}`}>
          {visibleRecommendations.map(({ stat, owned }, index) => {
            const displayName = translateBrawlerName(stat.name, locale);
            const recentPlays = typeof stat.recentPlays === "number" && Number.isSafeInteger(stat.recentPlays) &&
              stat.recentPlays >= 0 && stat.recentPlays <= stat.plays ? stat.recentPlays : null;
            return (
              <li key={stat.name} className={styles.card}>
              <Link
                href={localizedHref(locale, "/brawlers/" + (stat.id ?? owned.id))}
                className={styles.cardLink}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-blue-300">#{index + 1}</span>
                  <BrawlImage
                    src={"https://cdn.brawlify.com/brawlers/borders/" + (stat.id ?? owned.id) + ".png"}
                    alt={displayName}
                    width={40}
                    height={40}
                    sizes="40px"
                    className="h-10 w-10 rounded-md bg-blue-50 object-contain"
                    fallbackText={displayName.slice(0, 1)}
                  />
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-slate-900">{displayName}</p>
                    <p className="text-xs font-bold text-blue-600">
                      {copy.score} {stat.score.toLocaleString(numberLocales[locale])}
                    </p>
                  </div>
                </div>
                <div className={styles.playerStats}>
                  <span className="inline-flex items-center gap-1"><StatSymbol kind="trophy" size={12} />{copy.trophies} {owned.trophies.toLocaleString(numberLocales[locale])}</span>
                  <span className="inline-flex items-center gap-1"><StatSymbol kind="level" size={12} />{copy.power} {owned.power}</span>
                </div>
                <dl className={styles.evidence}>
                  <div><dt>{freshnessCopy.sample}</dt><dd>{stat.plays.toLocaleString(numberLocales[locale])}</dd></div>
                  <div><dt>{freshnessCopy.recent}</dt><dd>{recentPlays === null ? "—" : recentPlays.toLocaleString(numberLocales[locale])}</dd></div>
                </dl>
                {recentPlays !== null && recentPlays < 5 ? <p className={styles.lowRecent}>{copy.lowRecent}</p> : null}
              </Link>
              </li>
            );
          })}
        </ol>
        {ownedRecommendations.length > 3 ? <button type="button" className={styles.toggle}
          data-desktop-extra={ownedRecommendations.length > 5}
          aria-expanded={expanded} aria-controls={listId}
          onClick={() => setExpandedFor(expanded ? null : contextKey)}>
          {expanded ? copy.showLess : copy.showAll.replace("{count}", ownedRecommendations.length.toLocaleString(numberLocales[locale]))}
        </button> : null}
        </>
      ) : player ? (
        <div className="mt-4 rounded-lg bg-white p-4 text-sm font-bold text-slate-500">
        <p role="status">
          {copy.noMatches}
        </p>
        {powerFilter ? <button type="button" className={styles.reset} onClick={() => selectPower("0")}>{copy.resetPower}</button> : null}
        </div>
      ) : null}
    </section>
  );
}
