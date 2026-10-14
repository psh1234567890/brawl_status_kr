"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { sendUsageEvent } from "../utils/clientUsage";
import { parsePublicProfiles, publicProfileSnapshot, rememberPublicProfile, subscribePublicProfiles, type CachedPublicProfile } from "../utils/publicProfileCache";
import { profileReturnMessages } from "../i18n/profileReturnMessages";
import BattleLogList from "../components/BattleLogList";
import BrawlerList from "../components/BrawlerList";
import MyTagSearchButton from "../components/account/MyTagSearchButton";
import StatSymbol from "../components/StatSymbol";
import PlayerHistoryPanel from "../components/PlayerHistoryPanel";
import PlayerProfile from "../components/PlayerProfile";
import PlayerProgressionPanel from "../components/PlayerProgressionPanel";
import { usePlayerSearch } from "../hooks/usePlayerSearch";
import { localizedHref, numberLocales, type Locale } from "../i18n/config";
import {
  formatBattleRecord,
  formatBattles,
  formatItems,
  formatWinLossDraw,
  formatWins,
} from "../i18n/formatters";
import { getMessages } from "../i18n/messages";
import { profileHubMessages } from "../i18n/profileHubMessages";
import type {
  BattleLogItem,
  Brawler,
  PlayerHistoryResponse,
  PlayerOwnedSkin,
  RecentBattleSummary,
} from "../types/brawl";
import {
  calculateBrawlerStats,
  calculateRecentBattleSummary,
  estimatePlayTime,
} from "../utils/brawlHelpers";
import { translateModeName } from "../utils/brawlTranslations";
import { isValidPlayerTag, normalizePlayerTag } from "../utils/playerTag";

const BattleDetailsModal = dynamic(() => import("../components/BattleDetailsModal"));
const BrawlerDetailsModal = dynamic(() => import("../components/BrawlerDetailsModal"));

import BrandHeader from "./brand/BrandHeader";
import BrandFooter from "./brand/BrandFooter";
import HomeDiscovery from "./brand/HomeDiscovery";
import { BrandCharacter, BrandArrow, SearchIcon } from "./brand/BrandArt";
import { getBrandMessages } from "../i18n/brandMessages";
import brandStyles from "./brand/brand.module.css";

type ResultPanel = "overview" | "matches" | "brawlers" | "history";

const RESULT_TAB_IDS: ResultPanel[] = ["overview", "matches", "brawlers", "history"];

export default function Home({ locale = "ko" }: { locale?: Locale }) {
  const copy = getMessages(locale);
  const brand = getBrandMessages(locale);
  const actionCopy = profileHubMessages[locale];
  const search = usePlayerSearch(locale);
  const handlePlayerSearch = search.handleSearch;
  const [activePanel, setActivePanel] = useState<ResultPanel>("overview");
  const [selectedBrawler, setSelectedBrawler] = useState<Brawler | null>(null);
  const [selectedBattle, setSelectedBattle] = useState<BattleLogItem | null>(null);
  const [shareFeedback, setShareFeedback] = useState<"idle" | "copied" | "failed">("idle");
  const initialTagHandled = useRef(false);
  const profileSnapshot = useSyncExternalStore(subscribePublicProfiles, publicProfileSnapshot, () => "[]");
  const savedProfiles = useMemo(() => parsePublicProfiles(profileSnapshot), [profileSnapshot]);
  const cachedProfile = savedProfiles.find(item => item.tag === normalizePlayerTag(search.playerData?.tag ?? ""));
  useEffect(() => {
    if (search.playerData && search.playerData.dataFreshness?.status !== "stale") rememberPublicProfile(search.playerData);
  }, [search.playerData]);

  // Shared profile URLs only initiate a normal, validated player lookup.
  // A ref prevents duplicated requests when search state updates.
  useEffect(() => {
    if (initialTagHandled.current) return;
    initialTagHandled.current = true;
    const fromUrl = new URLSearchParams(window.location.search).get("tag");
    if (fromUrl && isValidPlayerTag(fromUrl)) {
      void handlePlayerSearch(normalizePlayerTag(fromUrl));
    }
  }, [handlePlayerSearch]);

  const summary = useMemo(
    () => calculateRecentBattleSummary(search.battleLog),
    [search.battleLog],
  );
  const playTime = useMemo(
    () => (search.playerData ? estimatePlayTime(search.playerData) : { hours: 0, minutes: 0 }),
    [search.playerData],
  );
  const recentBrawlerStat = useMemo(
    () =>
      selectedBrawler && search.playerData
        ? {
            name: selectedBrawler.name,
            ...calculateBrawlerStats(
              search.battleLog,
              search.playerData.tag,
              selectedBrawler.name,
            ),
          }
        : null,
    [search.battleLog, search.playerData, selectedBrawler],
  );
  const dbBrawlerStat = useMemo(
    () =>
      selectedBrawler
        ? search.dbStats?.brawlers.find((stat) => stat.name === selectedBrawler.name)
        : undefined,
    [search.dbStats, selectedBrawler],
  );
  const selectedExternalSkins = useMemo(
    () =>
      selectedBrawler
        ? getExternalSkinsForBrawler(search.skinInventory?.byBrawler, selectedBrawler.name)
        : [],
    [search.skinInventory, selectedBrawler],
  );
  const nameColor = search.playerData?.nameColor?.replace("0x", "#") ?? "#111827";
  const normalizedCurrentTag = search.playerData ? normalizePlayerTag(search.playerData.tag) : "";
  const isFavorite = normalizedCurrentTag
    ? search.favoriteSearches.includes(normalizedCurrentTag)
    : false;
  const resultTabs = RESULT_TAB_IDS.map((id) => ({ id, label: copy.home.tabs[id] }));

  function runSearch(targetTag?: string) {
    setActivePanel("overview");
    setShareFeedback("idle");
    void search.handleSearch(targetTag);
  }

  async function shareProfile() {
    if (!search.playerData || !normalizedCurrentTag) return;
    const url = new URL(localizedHref(locale, "/"), window.location.origin);
    url.searchParams.set("tag", normalizedCurrentTag);
    try {
      if (navigator.share) {
        await navigator.share({ title: search.playerData.name, url: url.href });
        setShareFeedback("idle");
      } else {
        await navigator.clipboard.writeText(url.href);
        setShareFeedback("copied");
      }
      sendUsageEvent("profile_share");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareFeedback("failed");
    }
  }

  return (
    <div className={brandStyles.page} lang={locale}>
      <BrandHeader locale={locale} />
      <main className={brandStyles.main}>
        <section className={search.playerData ? brandStyles.compactSearch : brandStyles.searchHero} aria-label={copy.home.playerSearchAria}>
          <div className={brandStyles.heroContent}>
            {!search.playerData && <><h1 className={brandStyles.multiline}>{brand.hero}</h1><p className={brandStyles.heroIntro}>{brand.intro}</p></>}
            <form className={brandStyles.searchForm} onSubmit={(event) => { event.preventDefault(); runSearch(); }}>
              <SearchIcon />
              <input value={search.tag} onChange={(event) => search.setTag(event.target.value)} placeholder={copy.home.playerTagPlaceholder} aria-label={copy.home.playerTag} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={16} />
              <button type="submit" disabled={search.loading}>{search.loading ? copy.home.searching : copy.home.search}<BrandArrow /></button>
            </form>
            <MyTagSearchButton locale={locale} loading={search.loading} onSearch={runSearch} />
            {!search.playerData && <details className={brandStyles.tagHelp}><summary>{brand.tagHelp}</summary><p>{brand.tagHelpBody}</p><p>{copy.home.searchEvery25Body}</p></details>}
          </div>
          {!search.playerData && <div className={brandStyles.heroArt} aria-hidden="true"><span className={brandStyles.heroDisc} /><BrandCharacter id={16000005} className={brandStyles.heroSpike} eager /><BrandCharacter id={16000023} className={brandStyles.heroLeon} eager /><span className={brandStyles.heroLabel}>LET’S<br />BRAWL!</span></div>}
        </section>
        {(search.favoriteSearches.length > 0 || search.recentSearches.length > 0) && <div className={`${brandStyles.savedSearches} ${search.playerData ? brandStyles.hideSavedOnMobile : ""}`}>
          <SearchChipGroup label={copy.home.favorites} tags={search.favoriteSearches} profiles={savedProfiles} onSearch={runSearch} locale={locale} strong />
          <SearchChipGroup label={copy.home.recentSearches} tags={search.recentSearches} profiles={savedProfiles} onSearch={runSearch} locale={locale} />
        </div>}

        {search.error ? <Message text={search.error} tone="error" /> : null}
        {search.notice ? <Message text={search.notice} tone="notice" /> : null}

        {search.playerData ? (
          <section className="mt-5 space-y-4" aria-label={copy.home.results}>
            <PlayerProfile
              playerData={search.playerData}
              nameColor={nameColor}
              streakCount={summary.streakCount}
              playTime={playTime}
              recentMatches={summary.total}
              recentWinRate={summary.winRate}
              locale={locale}
              actionsLabel={actionCopy.actionLabel}
              actions={
                <>
                  <Link
                    href={`${localizedHref(locale, "/compare")}?a=${encodeURIComponent(normalizedCurrentTag)}`}
                    onClick={() => sendUsageEvent("profile_compare")}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:w-auto sm:flex-none"
                  >
                    <StatSymbol kind="players" size={18} />
                    {actionCopy.compare}
                  </Link>
                  <button
                    type="button"
                    aria-pressed={isFavorite}
                    onClick={() => search.toggleFavorite(search.playerData?.tag)}
                    className={`inline-flex min-h-11 min-w-24 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:flex-none ${isFavorite ? "border-blue-300 bg-blue-100 text-blue-900" : "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50"}`}
                  >
                    <StatSymbol kind="star" size={18} />
                    {isFavorite ? actionCopy.saved : actionCopy.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => void shareProfile()}
                    className="inline-flex min-h-11 min-w-24 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:flex-none"
                  >
                    <StatSymbol kind="chart" size={18} />
                    {shareFeedback === "copied" ? actionCopy.copied : actionCopy.share}
                  </button>
                  {shareFeedback === "failed" ? <span role="status" className="self-center text-xs font-bold text-rose-700">{actionCopy.failed}</span> : null}
                  {cachedProfile?.previousTrophies !== undefined ? <span className="w-full self-center text-xs font-bold text-slate-600 sm:w-auto">
                    {profileReturnMessages[locale].previous} · {search.playerData.trophies - cachedProfile.previousTrophies > 0 ? "+" : ""}{(search.playerData.trophies - cachedProfile.previousTrophies).toLocaleString(numberLocales[locale])}
                    <StatSymbol kind="trophy" size={14} className="ml-1 inline" />
                  </span> : null}
                </>
              }
            />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">

              <div className="sticky top-0 z-20 -mx-4 border-y border-slate-200 bg-white px-4 py-2 sm:static sm:mx-0 sm:mb-4 sm:rounded-xl sm:border sm:bg-white sm:p-1">
                <div className="grid grid-cols-4 gap-1">
                  {resultTabs.map((tab) => (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => setActivePanel(tab.id)}
                      className={`flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 text-xs font-black transition-colors sm:text-sm ${
                        activePanel === tab.id
                          ? "bg-slate-950 text-white"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                      }`}
                    >
                      <StatSymbol
                        kind={tab.id === "overview" ? "chart" : tab.id === "matches" ? "battle" : tab.id === "brawlers" ? "players" : "timer"}
                        size={15}
                        className="hidden sm:inline-block"
                      />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {activePanel === "overview" ? (
                <>
                  <OverviewPanel
                    locale={locale}
                    summary={summary}
                    history={search.playerHistory}
                    brawlerCount={search.playerData.brawlers.length}
                    onOpenPanel={setActivePanel}
                  />
                  <PlayerProgressionPanel brawlers={search.playerData.brawlers} locale={locale} />
                </>
              ) : null}
              {activePanel === "matches" ? (
                search.battleLog ? (
                  <BattleLogList
                    battleLog={search.battleLog}
                    summary={summary}
                    onSelectBattle={setSelectedBattle}
                    locale={locale}
                  />
                ) : search.battleLoading ? (
                  <LoadingPanel label={copy.home.tabs.matches} loadingText={copy.home.searching} />
                ) : (
                  <EmptyPanel title={copy.home.battleMissingTitle} body={copy.home.battleMissingBody} />
                )
              ) : null}
              {activePanel === "brawlers" ? (
                <BrawlerList
                  brawlers={search.playerData.brawlers}
                  skinInventory={search.skinInventory}
                  skinInventoryStatus={search.skinInventoryStatus}
                  skinInventoryError={search.skinInventoryError}
                  onLoadSkinInventory={search.loadSkinInventory}
                  onSelectBrawler={setSelectedBrawler}
                  locale={locale}
                />
              ) : null}
              {activePanel === "history" ? (
                search.playerHistory ? (
                  <PlayerHistoryPanel history={search.playerHistory} locale={locale} />
                ) : search.historyLoading ? (
                  <LoadingPanel label={copy.home.tabs.history} loadingText={copy.home.searching} />
                ) : (
                  <EmptyPanel title={copy.home.historyPreparingTitle} body={copy.home.historyPreparingBody} />
                )
              ) : null}
            </div>

            <aside className="hidden flex-col gap-4 lg:flex">
              <SideSummary title={copy.home.recentWinRate} value={`${summary.winRate}%`} detail={formatWinLossDraw(locale, summary.wins, summary.defeats, summary.draws)} />
              <SideSummary title={copy.home.bestMode} value={translateModeName(summary.bestMode, locale)} detail={summary.maxModeWins > 0 ? formatWins(locale, summary.maxModeWins) : copy.home.battleDataShort} />
              <SideSummary title={copy.home.ownedBrawlers} value={formatItems(locale, search.playerData.brawlers.length)} detail={copy.home.brawlerTabDetail} />
              <SideSummary title={copy.home.storedBattles} value={formatBattles(locale, search.playerHistory?.totalTrackedGames ?? 0)} detail={copy.home.friendlyExcluded} />
            </aside>
            </div>
          </section>
        ) : (
          <HomeDiscovery locale={locale} />
        )}

        {selectedBrawler && recentBrawlerStat ? (
          <BrawlerDetailsModal
            brawler={selectedBrawler}
            externalSkins={selectedExternalSkins}
            skinInventoryCoverage={search.skinInventory?.coverage}
            skinSupplementalStatus={search.skinInventory?.supplementalStatus}
            skinInventoryStatus={search.skinInventoryStatus}
            skinInventoryError={search.skinInventoryError}
            recentStat={recentBrawlerStat}
            dbStat={dbBrawlerStat}
            locale={locale}
            onClose={() => setSelectedBrawler(null)}
          />
        ) : null}
        {selectedBattle ? (
          <BattleDetailsModal
            battle={selectedBattle}
            locale={locale}
            onClose={() => setSelectedBattle(null)}
            onSelectPlayer={(playerTag) => {
              setSelectedBattle(null);
              runSearch(playerTag);
            }}
          />
        ) : null}

      </main>
      <BrandFooter locale={locale} />
    </div>
  );
}

function SearchChipGroup({
  label,
  tags,
  locale,
  strong = false,
  onSearch,
  profiles,
}: {
  label: string;
  tags: string[];
  locale: Locale;
  strong?: boolean;
  onSearch: (tag: string) => void;
  profiles: CachedPublicProfile[];
}) {
  if (tags.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-black text-slate-500">{label}</span>
        <span className="text-[11px] font-bold text-slate-400">{formatItems(locale, tags.length)}</span>
      </div>
      {tags.length ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((savedTag) => {
            const profile = profiles.find(item => item.tag === normalizePlayerTag(savedTag));
            return (
            <button
              type="button"
              key={savedTag}
              onClick={() => { sendUsageEvent("profile_reopen"); onSearch(savedTag); }}
              title={profile ? `${profileReturnMessages[locale].local}: ${new Date(profile.checkedAt).toLocaleString(numberLocales[locale])}` : undefined}
              className={`min-h-11 rounded-lg px-3 text-xs font-black transition-colors ${
                strong
                  ? "bg-slate-950 text-white hover:bg-blue-700"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
              }`}
            >
              {profile ? <span className="block max-w-48 truncate">{profile.name} · {profile.trophies.toLocaleString(numberLocales[locale])}</span> : null}
              <span className={profile ? "block text-[10px] opacity-70" : ""}>{savedTag}</span>
            </button>
          ); })}
        </div>
      ) : null}
    </div>
  );
}

function OverviewPanel({
  locale,
  summary,
  history,
  brawlerCount,
  onOpenPanel,
}: {
  locale: Locale;
  summary: RecentBattleSummary;
  history: PlayerHistoryResponse | null;
  brawlerCount: number;
  onOpenPanel: (panel: ResultPanel) => void;
}) {
  const copy = getMessages(locale);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <div>
          <h2 className="text-lg font-black text-slate-950">{copy.home.overviewTitle}</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
            {copy.home.overviewBody}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewMetric
          label={copy.home.recentWinRate}
          value={`${summary.winRate}%`}
          detail={formatBattleRecord(locale, summary.total, summary.wins, summary.defeats)}
          onClick={() => onOpenPanel("matches")}
        />
        <OverviewMetric
          label={copy.home.bestMode}
          value={translateModeName(summary.bestMode, locale)}
          detail={summary.maxModeWins > 0 ? formatWins(locale, summary.maxModeWins) : copy.home.dataShort}
          onClick={() => onOpenPanel("matches")}
        />
        <OverviewMetric
          label={copy.home.ownedBrawlers}
          value={formatItems(locale, brawlerCount)}
          detail={copy.home.gearDetail}
          onClick={() => onOpenPanel("brawlers")}
        />
        <OverviewMetric
          label={copy.home.storedBattles}
          value={formatBattles(locale, history?.totalTrackedGames ?? 0)}
          detail={copy.home.accumulates}
          onClick={() => onOpenPanel("history")}
        />
      </div>
    </section>
  );
}

function OverviewMetric({
  label,
  value,
  detail,
  onClick,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-28 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
    >
      <span className="block text-xs font-black text-slate-500">{label}</span>
      <span className="mt-2 block truncate text-2xl font-black text-slate-950">{value}</span>
      <span className="mt-1 block text-xs font-bold text-slate-500">{detail}</span>
    </button>
  );
}

function SideSummary({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black text-slate-500">{title}</p>
      <p className="mt-2 truncate text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{detail}</p>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-500">{body}</p>
    </section>
  );
}

function LoadingPanel({ label, loadingText }: { label: string; loadingText: string }) {
  return (
    <section role="status" aria-live="polite" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-black text-slate-800">{label} · {loadingText}</h2>
      <div aria-hidden="true" className="mt-4 animate-pulse space-y-3">
        <div className="h-6 w-2/3 rounded-lg bg-slate-100" />
        <div className="h-16 rounded-lg bg-slate-100" />
        <div className="h-16 rounded-lg bg-slate-100" />
      </div>
    </section>
  );
}

function Message({ text, tone }: { text: string; tone: "error" | "notice" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mt-4 rounded-lg border px-4 py-3 text-sm font-black shadow-sm ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      {text}
    </div>
  );
}

function getExternalSkinsForBrawler(
  byBrawler: Record<string, PlayerOwnedSkin[]> | undefined,
  brawlerName: string,
) {
  return byBrawler?.[normalizeBrawlerSkinKey(brawlerName)] ?? [];
}

function normalizeBrawlerSkinKey(value: string) {
  return value
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "");
}
