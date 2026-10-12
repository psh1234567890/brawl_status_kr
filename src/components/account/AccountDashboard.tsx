"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { accountDashboardMessages } from "../../i18n/accountDashboardMessages";
import { localizedHref, numberLocales, type Locale } from "../../i18n/config";
import { getAccountMessages, localizedModeLabel } from "../../i18n/accountMessages";
import { getComponentMessages } from "../../i18n/componentMessages";
import { rankDict } from "../../constants/brawl";
import type { PersonalBestGameId, PersonalBestRecord } from "../../utils/minigames/personalBest";
import type { DashboardPlayer, MyRank } from "../../server/accountDashboard";
import { isValidPlayerTag, normalizePlayerTag } from "../../utils/playerTag";
import { getPlayerIconUrl } from "../../utils/brawlAssets";
import BrawlImage from "../BrawlImage";
import RankedLeagueIcon from "../RankedLeagueIcon";
import StatSymbol from "../StatSymbol";
import type { StatSymbolKind } from "../StatSymbol";

type Overview = {
  defaultPlayerTag: string | null;
  player: DashboardPlayer | null;
  rankings: MyRank[];
};
type OverviewState = { userId: string; phase: "loading" | "ready" | "error"; data: Overview | null };
const RECENT_TAGS_KEY = "recentTags";
const RECENT_TAGS_CHANGED_EVENT = "recentTagsChanged";

function recentSnapshot() {
  if (typeof window === "undefined") return "[]";
  try { return window.localStorage.getItem(RECENT_TAGS_KEY) ?? "[]"; }
  catch { return "[]"; }
}
function subscribeRecent(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(RECENT_TAGS_CHANGED_EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(RECENT_TAGS_CHANGED_EVENT, notify);
  };
}
export function parseLocalRecentTags(value: string): string[] {
  try {
    const list: unknown = JSON.parse(value);
    if (!Array.isArray(list)) return [];
    return [...new Set(list
      .filter((item): item is string => typeof item === "string")
      .map(normalizePlayerTag)
      .filter(isValidPlayerTag))].slice(0, 5);
  } catch { return []; }
}

const gamePaths: Record<PersonalBestGameId, string> = {
  "brawler-quiz": "/minigames/brawler-quiz", "silhouette-quiz": "/minigames/silhouette-quiz",
  "map-quiz": "/minigames/map-quiz", "ability-quiz": "/minigames/ability-quiz",
  "higher-lower": "/minigames/higher-lower", "release-order": "/minigames/release-order",
};
function gameName(locale: Locale, game: PersonalBestGameId) {
  const old = getAccountMessages(locale).gameNames;
  if (game === "higher-lower") return "Higher or Lower";
  if (game === "release-order") return locale === "ko" ? "출시 순서 맞추기" : "Release Order";
  return old[game];
}

export default function AccountDashboard({ locale, accountId, revision, nickname, savedTag, bests, bestLoading }: {
  locale: Locale; accountId: string; revision: number; nickname: string;
  savedTag: string | null; bests: PersonalBestRecord[]; bestLoading: boolean;
}) {
  const copy = accountDashboardMessages[locale];
  const [overview, setOverview] = useState<OverviewState>({ userId: "", phase: "loading", data: null });
  const [period, setPeriod] = useState<"today" | "week" | "all">("week");
  const snapshot = useSyncExternalStore(subscribeRecent, recentSnapshot, () => "[]");
  const recents = useMemo(() => parseLocalRecentTags(snapshot), [snapshot]);
  const active = overview.userId === accountId && overview.phase === "ready" ? overview.data : null;
  const dataError = overview.userId === accountId && overview.phase === "error";
  const loading = overview.userId !== accountId || overview.phase === "loading";
  const tag = normalizePlayerTag(savedTag ?? "");
  const validTag = isValidPlayerTag(tag);
  const shownBests = useMemo(() => [...bests].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  ), [bests]);
  const latestBests = shownBests.filter(best => Number.isFinite(Date.parse(best.updatedAt))).slice(0, 3);
  const fmt = (value: number) => value.toLocaleString(numberLocales[locale]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/account/dashboard", {
          cache: "no-store", credentials: "same-origin", signal: controller.signal,
        });
        if (!response.ok) throw new Error("UNAVAILABLE");
        const data = await response.json() as Overview;
        if (!controller.signal.aborted) setOverview({ userId: accountId, phase: "ready", data });
      } catch {
        if (!controller.signal.aborted) setOverview({ userId: accountId, phase: "error", data: null });
      }
    })();
    return () => controller.abort();
  }, [accountId, revision]);

  return <section className="space-y-4" aria-label={copy.title}>
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-800 px-5 py-6 text-white shadow-sm sm:px-7">
      <p className="text-xs font-black uppercase tracking-wider text-blue-100">{copy.profile} · {nickname}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{copy.title}</h2>
      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-blue-100">{copy.subtitle}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={localizedHref(locale, "/")} className="inline-flex min-h-11 items-center rounded-lg bg-white px-4 py-2 text-sm font-black text-blue-800 hover:bg-blue-50">{copy.openSearch}</Link>
        <a href="#account-profile-settings" className="inline-flex min-h-11 items-center rounded-lg border border-blue-200/70 px-4 py-2 text-sm font-black text-white hover:bg-white/10">{copy.edit}</a>
      </div>
    </div>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label={copy.myPlayer}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black">{copy.myPlayer}</h3>
          {validTag ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-800">#{tag}</span> : null}
        </div>
        {!validTag ? <p className="mt-4 text-sm text-slate-600">{copy.noTag} {copy.configure}</p>
          : loading ? <p role="status" className="mt-4 text-sm text-slate-600">{copy.loading}</p>
          : active?.player && active.player.tag === tag ? <>
            <div className="mt-4 flex min-w-0 items-center gap-3">
              {active.player.iconId ? <BrawlImage src={getPlayerIconUrl(active.player.iconId)} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-lg object-cover" fallbackText="P" />
                : <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-black">P</span>}
              <p className="min-w-0 truncate text-lg font-black">{active.player.name}</p>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2">
              {([
                [copy.trophies, active.player.trophies, "trophy"],
                [copy.highest, active.player.highestTrophies, "trophy"],
                [copy.victories, active.player.victories3v3, "players"],
                [copy.brawlers, active.player.brawlerCount, "battle"],
              ] as readonly (readonly [string, number, StatSymbolKind])[]).map(([label, value, icon]) => <div key={label} className="rounded-lg bg-slate-50 p-3">
                <dt className="flex items-center gap-1 text-xs font-bold text-slate-500"><StatSymbol kind={icon} size={14} />{label}</dt>
                <dd className="mt-1 text-lg font-black tabular-nums">{fmt(value)}</dd>
              </div>)}
            </dl>
            {(active.player.currentRankedRankName || active.player.highestRankedRankName) ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {([
                  [getComponentMessages(locale).profile.currentRanked, active.player.currentRankedRankName, active.player.currentRankedElo],
                  [getComponentMessages(locale).profile.allTimeRanked, active.player.highestRankedRankName, active.player.highestRankedElo],
                ] as const).map(([label, rankName, elo]) => rankName ? (
                  <div key={label} className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-100 bg-blue-50/60 px-3 py-2">
                    <RankedLeagueIcon rankName={rankName} className="h-10 w-10" />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-slate-500">{label}</p>
                      <p className="truncate text-sm font-black text-slate-900">
                        {locale === "ko" ? rankDict[rankName] ?? rankName : rankName}
                        {typeof elo === "number" ? ` (${fmt(elo)})` : ""}
                      </p>
                    </div>
                  </div>
                ) : null)}
              </div>
            ) : null}
          </> : <p role={dataError ? "alert" : "status"} className="mt-4 text-sm text-slate-600">{copy.unavailable}</p>}
        {validTag ? <Link href={localizedHref(locale, "/")} className="mt-4 inline-flex min-h-11 items-center text-sm font-black text-blue-700 underline">{copy.openSearch} →</Link> : null}
      </article>

      <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label={copy.rankings}>
        <h3 className="text-lg font-black">{copy.rankings}</h3>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={copy.rankings}>
          {(["today", "week", "all"] as const).map(item => <button key={item} type="button" onClick={() => setPeriod(item)}
            aria-pressed={period === item}
            className={`min-h-10 rounded-lg border px-3 text-xs font-black ${period === item ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{copy[item]}</button>)}
        </div>
        <ul className="mt-3 space-y-2">
          {(["higher-lower", "release-order"] as const).map(game => {
            const entry = active?.rankings.find(item => item.gameId === game && item.period === period);
            return <li key={game} className="rounded-lg bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={localizedHref(locale, gamePaths[game])} className="text-sm font-black text-blue-800 underline">{gameName(locale, game)}</Link>
                <strong className="text-sm">{entry?.rank ? `${fmt(entry.rank)}${locale === "ko" ? copy.rank : " " + copy.rank} · ${entry.score}/10` : loading ? copy.loading : dataError ? copy.unavailable : copy.unranked}</strong>
              </div>
            </li>;
          })}
        </ul>
        <p className="mt-3 text-xs leading-5 text-slate-500">{copy.noRanks} · {copy.rankings}</p>
      </article>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label={copy.personalBests}>
        <h3 className="text-lg font-black">{copy.personalBests}</h3>
        {bestLoading ? <p role="status" className="mt-3 text-sm text-slate-500">{copy.loading}</p>
          : shownBests.length === 0 ? <p className="mt-3 text-sm text-slate-500">{copy.noBests}</p>
          : <ul className="mt-3 divide-y divide-slate-100">
            {shownBests.slice(0, 6).map(best => <li key={`${best.gameId}:${best.mode}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <Link className="font-bold text-slate-700 hover:text-blue-700" href={localizedHref(locale, gamePaths[best.gameId])}>{gameName(locale, best.gameId)} · {localizedModeLabel(locale, best.mode)}</Link>
              <strong className="text-blue-700 tabular-nums">{best.score}/{best.total}</strong>
            </li>)}
          </ul>}
      </article>
      <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label={copy.recent}>
        <h3 className="text-lg font-black">{copy.recent}</h3>
        <p className="mt-2 text-xs leading-5 text-slate-500">{copy.browserOnly}</p>
        {recents.length ? <ul className="mt-3 flex flex-wrap gap-2">{recents.map(value =>
          <li key={value} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-black text-blue-800">#{value}</li>)}</ul>
          : <p className="mt-3 text-sm text-slate-500">{copy.noRecent}</p>}
        <h4 className="mt-5 text-sm font-black">{copy.recentBests}</h4>
        {latestBests.length ? <ul className="mt-2 space-y-2">{latestBests.map(best =>
          <li key={`${best.gameId}:${best.mode}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-xs">
            <span className="font-bold">{gameName(locale, best.gameId)} · {best.score}/{best.total}</span>
            <time dateTime={best.updatedAt} className="text-slate-500">{new Date(best.updatedAt).toLocaleDateString(numberLocales[locale])}</time>
          </li>)}</ul> : <p className="mt-2 text-sm text-slate-500">{copy.noActivity}</p>}
      </article>
    </div>
  </section>;
}
