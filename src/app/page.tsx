"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import BattleLogList from "../components/BattleLogList";
import BrawlerList from "../components/BrawlerList";
import LanguageSwitcher from "../components/LanguageSwitcher";
import PlayerHistoryPanel from "../components/PlayerHistoryPanel";
import PlayerProfile from "../components/PlayerProfile";
import { usePlayerSearch } from "../hooks/usePlayerSearch";
import { localizedHref, type Locale } from "../i18n/config";
import {
  formatBattleRecord,
  formatBattles,
  formatItems,
  formatWinLossDraw,
  formatWins,
} from "../i18n/formatters";
import { getMessages } from "../i18n/messages";
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
import { normalizePlayerTag } from "../utils/playerTag";

const BattleDetailsModal = dynamic(() => import("../components/BattleDetailsModal"));
const BrawlerDetailsModal = dynamic(() => import("../components/BrawlerDetailsModal"));

type ResultPanel = "overview" | "matches" | "brawlers" | "history";

const RESULT_TAB_IDS: ResultPanel[] = ["overview", "matches", "brawlers", "history"];

export default function Home({ locale = "ko" }: { locale?: Locale }) {
  const copy = getMessages(locale);
  const search = usePlayerSearch(locale);
  const [activePanel, setActivePanel] = useState<ResultPanel>("overview");
  const [selectedBrawler, setSelectedBrawler] = useState<Brawler | null>(null);
  const [selectedBattle, setSelectedBattle] = useState<BattleLogItem | null>(null);

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
  const primaryLinks = [
    { href: "/meta", label: copy.common.meta, description: copy.home.mapMetaDescription },
    { href: "/skins", label: copy.home.skinCatalog, description: copy.home.skinCatalogDescription },
  ];
  const utilityLinks = [
    ["/events", copy.common.events],
    ["/maps", copy.common.maps],
    ["/gamemodes", copy.common.modes],
    ["/brawlers", copy.common.brawlers],
    ["/clubs", copy.common.clubs],
    ["/rankings", copy.common.rankings],
    ["/teams", copy.common.teams],
    ["/counters", copy.common.counters],
    ["/status", copy.common.status],
  ] as const;

  function runSearch(targetTag?: string) {
    setActivePanel("overview");
    void search.handleSearch(targetTag);
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] pb-24 text-slate-950 sm:pb-12">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 -mx-4 border-b border-slate-200/80 bg-[#f6f7fb]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-5">
          <div className="flex items-center justify-between gap-3">
            <Link href={localizedHref(locale, "/")} className="min-w-0" aria-label={copy.home.homeAria}>
              <h1 className="block text-lg font-black tracking-normal text-slate-950 sm:text-2xl">
                Brawl Status KR
              </h1>
              <span className="block truncate text-xs font-bold text-slate-500 sm:text-sm">
                {copy.home.brandSubtitle}
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <nav className="hidden items-center gap-2 md:flex" aria-label={copy.common.mainNavigation}>
                {primaryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={localizedHref(locale, link.href)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <LanguageSwitcher locale={locale} />
            </div>
          </div>
        </header>

        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]" aria-label={copy.home.playerSearchAria}>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1">
                <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                  Player Tag
                </span>
                <input
                  type="text"
                  value={search.tag}
                  onChange={(event) => search.setTag(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") runSearch();
                  }}
                  placeholder={copy.home.playerTagPlaceholder}
                  aria-label={copy.home.playerTag}
                  className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base font-black text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <button
                type="button"
                onClick={() => runSearch()}
                disabled={search.loading}
                className="h-12 rounded-lg bg-blue-600 px-6 text-base font-black text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 sm:min-w-32"
              >
                {search.loading ? copy.home.searching : copy.home.search}
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-lg font-black text-blue-900 sm:text-2xl">
                {copy.home.searchEvery25Title}
              </p>
              <p className="mt-1 text-sm font-bold leading-6 text-blue-700">
                {copy.home.searchEvery25Body}
              </p>
            </div>

            {search.playerData ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => search.toggleFavorite(search.playerData?.tag)}
                  className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 transition-colors hover:border-blue-300 hover:text-blue-700"
                >
                  {isFavorite ? copy.home.removeFavorite : copy.home.addFavorite}
                </button>
                <span className="text-xs font-bold text-slate-500">
                  {copy.home.currentTag} {normalizedCurrentTag}
                </span>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SearchChipGroup
                label={copy.home.favorites}
                emptyLabel={copy.home.noFavorites}
                tags={search.favoriteSearches}
                onSearch={runSearch}
                locale={locale}
                strong
              />
              <SearchChipGroup
                label={copy.home.recentSearches}
                emptyLabel={copy.home.recentSearchesEmpty}
                tags={search.recentSearches}
                onSearch={runSearch}
                locale={locale}
              />
            </div>
          </div>

          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-slate-950">{copy.home.shortcuts}</h2>
            <div className="mt-3 grid gap-2">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={localizedHref(locale, link.href)}
                  className="rounded-lg border border-slate-200 px-3 py-3 transition-colors hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="block text-sm font-black text-slate-900">{link.label}</span>
                  <span className="mt-1 block text-xs font-bold text-slate-500">{link.description}</span>
                </Link>
              ))}
            </div>
            <nav className="mt-4 flex flex-wrap gap-2" aria-label={copy.home.extendedFeatures}>
              {utilityLinks.map(([href, label]) => (
                <Link
                  key={href}
                  href={localizedHref(locale, href)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 transition-colors hover:border-blue-300 hover:bg-white hover:text-blue-700"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </aside>
        </section>

        {search.error ? <Message text={search.error} tone="error" /> : null}
        {search.notice ? <Message text={search.notice} tone="notice" /> : null}

        {search.playerData ? (
          <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]" aria-label={copy.home.results}>
            <div className="min-w-0">
              <PlayerProfile
                playerData={search.playerData}
                nameColor={nameColor}
                streakCount={summary.streakCount}
                playTime={playTime}
                locale={locale}
              />

              <div className="sticky top-[73px] z-20 -mx-4 border-y border-slate-200 bg-[#f6f7fb]/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:mb-4 sm:rounded-xl sm:border sm:bg-white sm:p-1">
                <div className="grid grid-cols-4 gap-1">
                  {resultTabs.map((tab) => (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => setActivePanel(tab.id)}
                      className={`min-h-11 rounded-lg px-2 text-sm font-black transition-colors ${
                        activePanel === tab.id
                          ? "bg-slate-950 text-white"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {activePanel === "overview" ? (
                <OverviewPanel
                  locale={locale}
                  summary={summary}
                  history={search.playerHistory}
                  brawlerCount={search.playerData.brawlers.length}
                  onOpenPanel={setActivePanel}
                />
              ) : null}
              {activePanel === "matches" ? (
                search.battleLog ? (
                  <BattleLogList
                    battleLog={search.battleLog}
                    summary={summary}
                    onSelectBattle={setSelectedBattle}
                    locale={locale}
                  />
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
          </section>
        ) : (
          <EmptyStart locale={locale} />
        )}

        {selectedBrawler && recentBrawlerStat ? (
          <BrawlerDetailsModal
            brawler={selectedBrawler}
            externalSkins={selectedExternalSkins}
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

        <footer className="mt-10 flex flex-col justify-between gap-4 border-t border-slate-200 py-6 text-sm font-bold text-slate-500 sm:flex-row sm:items-center">
          <div>
            <p>2026 Brawl Stars Analytics. All rights reserved.</p>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {copy.home.bugContact}: seunghunbag76@gmail.com
            </p>
            <p className="mt-1 max-w-xl text-xs font-medium text-slate-400">
              {copy.common.fanDisclaimer}{" "}
              <a
                href="https://supercell.com/en/fan-content-policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-700 hover:underline"
              >
                Fan Content Policy
              </a>
            </p>
          </div>
          <nav className="flex flex-wrap gap-3" aria-label={copy.home.siteInfo}>
            <Link href={localizedHref(locale, "/about")} className="hover:text-slate-950 hover:underline">{copy.home.about}</Link>
            <Link href={localizedHref(locale, "/methodology")} className="hover:text-slate-950 hover:underline">{copy.common.methodology}</Link>
            <Link href={localizedHref(locale, "/privacy")} className="hover:text-slate-950 hover:underline">{copy.common.privacy}</Link>
            <Link href={localizedHref(locale, "/terms")} className="hover:text-slate-950 hover:underline">{copy.home.terms}</Link>
            <Link href={localizedHref(locale, "/contact")} className="hover:text-slate-950 hover:underline">{copy.home.contact}</Link>
            <a
              href="https://github.com/psh1234567890/brawl_status_kr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-950 hover:underline"
            >
              {copy.common.openSource}
            </a>
          </nav>
        </footer>
      </div>

      <MobileNavigation locale={locale} />
    </main>
  );
}

function SearchChipGroup({
  label,
  emptyLabel,
  tags,
  locale,
  strong = false,
  onSearch,
}: {
  label: string;
  emptyLabel: string;
  tags: string[];
  locale: Locale;
  strong?: boolean;
  onSearch: (tag: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-black text-slate-500">{label}</span>
        <span className="text-[11px] font-bold text-slate-400">{formatItems(locale, tags.length)}</span>
      </div>
      {tags.length ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((savedTag) => (
            <button
              type="button"
              key={savedTag}
              onClick={() => onSearch(savedTag)}
              className={`min-h-9 rounded-lg px-3 text-xs font-black transition-colors ${
                strong
                  ? "bg-slate-950 text-white hover:bg-blue-700"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
              }`}
            >
              {savedTag}
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs font-bold text-slate-400">
          {emptyLabel}
        </p>
      )}
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

function EmptyStart({ locale }: { locale: Locale }) {
  const copy = getMessages(locale).home;
  return (
    <section className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{copy.emptyStartTitle}</h2>
      <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500">
        {copy.emptyStartBody}
      </p>
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

function MobileNavigation({ locale }: { locale: Locale }) {
  const copy = getMessages(locale);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden" aria-label={copy.home.mobileNav}>
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {[
          ["/", copy.home.mobileHome],
          ["/meta", copy.home.mobileMeta],
          ["/skins", copy.common.skins],
          ["/rankings", copy.common.rankings],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={localizedHref(locale, href)}
            className="min-h-11 rounded-lg px-2 py-2 text-center text-xs font-black text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
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
