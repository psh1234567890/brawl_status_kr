"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import BattleDetailsModal from "../components/BattleDetailsModal";
import BattleLogList from "../components/BattleLogList";
import BrawlerDetailsModal from "../components/BrawlerDetailsModal";
import BrawlerList from "../components/BrawlerList";
import PlayerHistoryPanel from "../components/PlayerHistoryPanel";
import PlayerProfile from "../components/PlayerProfile";
import { usePlayerSearch } from "../hooks/usePlayerSearch";
import type {
  BattleLogItem,
  Brawler,
  PlayerHistoryResponse,
  PlayerOwnedSkin,
  PlayerSkinInventoryStatus,
  RecentBattleSummary,
} from "../types/brawl";
import {
  calculateBrawlerStats,
  calculateRecentBattleSummary,
  estimatePlayTime,
} from "../utils/brawlHelpers";
import { translateModeName } from "../utils/brawlTranslations";
import { normalizePlayerTag } from "../utils/playerTag";

type ResultPanel = "overview" | "matches" | "brawlers" | "history";

const RESULT_TABS: { id: ResultPanel; label: string }[] = [
  { id: "overview", label: "요약" },
  { id: "matches", label: "전투" },
  { id: "brawlers", label: "브롤러" },
  { id: "history", label: "누적" },
];

const PRIMARY_LINKS = [
  { href: "/meta", label: "맵 추천", description: "DB 전체 전투 데이터 기반" },
  { href: "/skins", label: "스킨 카탈로그", description: "브롤러별 전체 스킨 보기" },
];

const UTILITY_LINKS = [
  ["/events", "로테이션"],
  ["/maps", "맵"],
  ["/gamemodes", "모드"],
  ["/brawlers", "브롤러"],
  ["/clubs", "클럽"],
  ["/rankings", "랭킹"],
  ["/teams", "팀 조합"],
  ["/counters", "카운터"],
  ["/status", "수집 현황"],
] as const;

export default function Home() {
  const search = usePlayerSearch();
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

  function runSearch(targetTag?: string) {
    setActivePanel("overview");
    void search.handleSearch(targetTag);
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] pb-24 text-slate-950 sm:pb-12">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 -mx-4 border-b border-slate-200/80 bg-[#f6f7fb]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-5">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="min-w-0" aria-label="홈으로 이동">
              <span className="block text-lg font-black tracking-normal text-slate-950 sm:text-2xl">
                Brawl Status KR
              </span>
              <span className="block truncate text-xs font-bold text-slate-500 sm:text-sm">
                전투 기록, 브롤러 보유 현황, DB 기반 추천
              </span>
            </Link>
            <nav className="hidden items-center gap-2 md:flex" aria-label="주요 기능">
              {PRIMARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]" aria-label="플레이어 검색">
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
                  placeholder="예: 9C82J8YPP"
                  aria-label="플레이어 태그"
                  className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base font-black text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <button
                type="button"
                onClick={() => runSearch()}
                disabled={search.loading}
                className="h-12 rounded-lg bg-blue-600 px-6 text-base font-black text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 sm:min-w-32"
              >
                {search.loading ? "검색 중" : "검색"}
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-lg font-black text-blue-900 sm:text-2xl">
                25경기마다 검색하는 것을 권장합니다
              </p>
              <p className="mt-1 text-sm font-bold leading-6 text-blue-700">
                공식 전투 기록은 최근 최대 25경기만 제공됩니다. 자주 검색할수록 누적 DB 통계와 맵 추천이 더 정확해집니다.
              </p>
            </div>

            {search.playerData ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => search.toggleFavorite(search.playerData?.tag)}
                  className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 transition-colors hover:border-blue-300 hover:text-blue-700"
                >
                  {isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                </button>
                <span className="text-xs font-bold text-slate-500">
                  현재 태그 {normalizedCurrentTag}
                </span>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SearchChipGroup
                label="즐겨찾기"
                emptyLabel="아직 즐겨찾기가 없습니다"
                tags={search.favoriteSearches}
                onSearch={runSearch}
                strong
              />
              <SearchChipGroup
                label="최근 검색"
                emptyLabel="검색 후 자동으로 저장됩니다"
                tags={search.recentSearches}
                onSearch={runSearch}
              />
            </div>
          </div>

          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-slate-950">바로가기</h2>
            <div className="mt-3 grid gap-2">
              {PRIMARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg border border-slate-200 px-3 py-3 transition-colors hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="block text-sm font-black text-slate-900">{link.label}</span>
                  <span className="mt-1 block text-xs font-bold text-slate-500">{link.description}</span>
                </Link>
              ))}
            </div>
            <nav className="mt-4 flex flex-wrap gap-2" aria-label="확장 기능">
              {UTILITY_LINKS.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
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
          <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]" aria-label="검색 결과">
            <div className="min-w-0">
              <PlayerProfile
                playerData={search.playerData}
                nameColor={nameColor}
                streakCount={summary.streakCount}
                playTime={playTime}
              />

              <div className="sticky top-[73px] z-20 -mx-4 border-y border-slate-200 bg-[#f6f7fb]/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:mb-4 sm:rounded-xl sm:border sm:bg-white sm:p-1">
                <div className="grid grid-cols-4 gap-1">
                  {RESULT_TABS.map((tab) => (
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
                  summary={summary}
                  history={search.playerHistory}
                  brawlerCount={search.playerData.brawlers.length}
                  skinStatus={search.skinInventoryStatus}
                  skinError={search.skinInventoryError}
                  onOpenPanel={setActivePanel}
                />
              ) : null}
              {activePanel === "matches" ? (
                search.battleLog ? (
                  <BattleLogList
                    battleLog={search.battleLog}
                    summary={summary}
                    onSelectBattle={setSelectedBattle}
                  />
                ) : (
                  <EmptyPanel title="전투 기록을 불러오지 못했습니다" body="프로필은 표시되지만 최근 경기 데이터가 비어 있습니다." />
                )
              ) : null}
              {activePanel === "brawlers" ? (
                <BrawlerList
                  brawlers={search.playerData.brawlers}
                  skinInventory={search.skinInventory}
                  skinInventoryStatus={search.skinInventoryStatus}
                  skinInventoryError={search.skinInventoryError}
                  onSelectBrawler={setSelectedBrawler}
                />
              ) : null}
              {activePanel === "history" ? (
                search.playerHistory ? (
                  <PlayerHistoryPanel
                    tag={search.playerData.tag}
                    history={search.playerHistory}
                  />
                ) : (
                  <EmptyPanel title="누적 기록을 준비 중입니다" body="검색이 누적되면 일별 기록과 자주 플레이한 맵, 모드가 표시됩니다." />
                )
              ) : null}
            </div>

            <aside className="hidden flex-col gap-4 lg:flex">
              <SideSummary title="최근 승률" value={`${summary.winRate}%`} detail={`${summary.wins}승 ${summary.defeats}패 ${summary.draws}무`} />
              <SideSummary title="많이 이긴 모드" value={translateModeName(summary.bestMode)} detail={summary.maxModeWins > 0 ? `${summary.maxModeWins}승` : "전투 기록 부족"} />
              <SideSummary title="보유 브롤러" value={`${search.playerData.brawlers.length}개`} detail="브롤러 탭에서 상세 확인" />
              <SideSummary title="저장된 전투" value={`${search.playerHistory?.totalTrackedGames ?? 0}개`} detail="친선 경기는 통계에서 제외" />
            </aside>
          </section>
        ) : (
          <EmptyStart />
        )}

        {selectedBrawler && recentBrawlerStat ? (
          <BrawlerDetailsModal
            brawler={selectedBrawler}
            externalSkins={selectedExternalSkins}
            skinInventoryStatus={search.skinInventoryStatus}
            skinInventoryError={search.skinInventoryError}
            recentStat={recentBrawlerStat}
            dbStat={dbBrawlerStat}
            onClose={() => setSelectedBrawler(null)}
          />
        ) : null}
        {selectedBattle ? (
          <BattleDetailsModal
            battle={selectedBattle}
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
              버그 제보 및 기능 건의: seunghunbag76@gmail.com
            </p>
          </div>
          <nav className="flex flex-wrap gap-3" aria-label="사이트 정보">
            <Link href="/about" className="hover:text-slate-950 hover:underline">소개</Link>
            <Link href="/privacy" className="hover:text-slate-950 hover:underline">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-slate-950 hover:underline">이용 안내</Link>
            <Link href="/contact" className="hover:text-slate-950 hover:underline">문의</Link>
            <a
              href="https://github.com/psh1234567890/brawl_status_kr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-950 hover:underline"
            >
              GitHub
            </a>
          </nav>
        </footer>
      </div>

      <MobileNavigation />
    </main>
  );
}

function SearchChipGroup({
  label,
  emptyLabel,
  tags,
  strong = false,
  onSearch,
}: {
  label: string;
  emptyLabel: string;
  tags: string[];
  strong?: boolean;
  onSearch: (tag: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-black text-slate-500">{label}</span>
        <span className="text-[11px] font-bold text-slate-400">{tags.length}개</span>
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
  summary,
  history,
  brawlerCount,
  skinStatus,
  skinError,
  onOpenPanel,
}: {
  summary: RecentBattleSummary;
  history: PlayerHistoryResponse | null;
  brawlerCount: number;
  skinStatus: PlayerSkinInventoryStatus;
  skinError: string;
  onOpenPanel: (panel: ResultPanel) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">이번 검색 요약</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
            친선 경기는 목록에는 표시하지만 승률과 추천 통계에는 반영하지 않습니다.
          </p>
        </div>
        <StatusPill status={skinStatus} error={skinError} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewMetric
          label="최근 승률"
          value={`${summary.winRate}%`}
          detail={`${summary.total}전 ${summary.wins}승 ${summary.defeats}패`}
          onClick={() => onOpenPanel("matches")}
        />
        <OverviewMetric
          label="많이 이긴 모드"
          value={translateModeName(summary.bestMode)}
          detail={summary.maxModeWins > 0 ? `${summary.maxModeWins}승 기록` : "데이터 부족"}
          onClick={() => onOpenPanel("matches")}
        />
        <OverviewMetric
          label="보유 브롤러"
          value={`${brawlerCount}개`}
          detail="가젯, 스타파워, 기어 확인"
          onClick={() => onOpenPanel("brawlers")}
        />
        <OverviewMetric
          label="저장된 전투"
          value={`${history?.totalTrackedGames ?? 0}개`}
          detail="검색할수록 누적됩니다"
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

function StatusPill({
  status,
  error,
}: {
  status: PlayerSkinInventoryStatus;
  error: string;
}) {
  const label =
    status === "loading"
      ? "스킨 조회 중"
      : status === "ready"
        ? "스킨 조회 완료"
        : status === "error"
          ? "스킨 일부 미표시"
          : "스킨 대기";
  const className =
    status === "ready"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "error"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex min-h-9 items-center rounded-lg border px-3 text-xs font-black ${className}`}
      title={error || undefined}
    >
      {label}
    </span>
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

function EmptyStart() {
  return (
    <section className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">플레이어 태그를 검색해 보세요</h2>
      <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500">
        프로필, 최근 전투, 브롤러 보유 현황, 스킨 조회 상태, 누적 DB 기록을 한 화면에서 확인할 수 있습니다.
        모바일에서는 결과 탭을 눌러 필요한 정보만 빠르게 볼 수 있습니다.
      </p>
    </section>
  );
}

function Message({ text, tone }: { text: string; tone: "error" | "notice" }) {
  return (
    <div
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

function MobileNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden" aria-label="모바일 빠른 이동">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {[
          ["/", "홈"],
          ["/meta", "추천"],
          ["/skins", "스킨"],
          ["/rankings", "랭킹"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
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
