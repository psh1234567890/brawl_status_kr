"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BattleDetailsModal from "../components/BattleDetailsModal";
import BattleLogList from "../components/BattleLogList";
import BrawlerDetailsModal from "../components/BrawlerDetailsModal";
import BrawlerList from "../components/BrawlerList";
import PlayerProfile from "../components/PlayerProfile";
import { usePlayerSearch } from "../hooks/usePlayerSearch";
import type { BattleLogItem, Brawler } from "../types/brawl";
import {
  calculateBrawlerStats,
  calculateRecentBattleSummary,
  estimatePlayTime,
} from "../utils/brawlHelpers";

export default function Home() {
  const search = usePlayerSearch();
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
  const nameColor = search.playerData?.nameColor?.replace("0x", "#") ?? "#1f2937";

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8 sm:p-8">
      <header className="mb-8 mt-10 text-center">
        <h1 className="mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-4xl font-black text-transparent drop-shadow-sm sm:text-5xl">
          브롤스타즈 전적 검색
        </h1>
        <p className="inline-block rounded-full bg-white px-4 py-1 text-md font-bold text-gray-500 shadow-sm">
          영어 대소문자와 # 기호는 구분하지 않습니다.
        </p>
        <nav className="mt-4 flex flex-wrap justify-center gap-3" aria-label="주요 기능">
          <Link href="/meta" className="rounded-full border-4 border-white bg-indigo-600 px-8 py-4 text-xl font-black text-white shadow-lg transition-transform hover:scale-105">
            맵별 추천 보기
          </Link>
          <Link href="/skins" className="rounded-full border-4 border-indigo-100 bg-white px-8 py-4 text-xl font-black text-indigo-700 shadow-lg transition-transform hover:scale-105">
            스킨 카탈로그
          </Link>
        </nav>
      </header>

      <section className="mb-10 flex w-full max-w-md flex-col items-center gap-4" aria-label="플레이어 검색">
        <div className="flex w-full flex-col overflow-hidden rounded-2xl border-2 border-white shadow-xl sm:flex-row">
          <input
            type="text"
            value={search.tag}
            onChange={(event) => search.setTag(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void search.handleSearch();
            }}
            placeholder="플레이어 태그 (예: 2Q89RU)"
            aria-label="플레이어 태그"
            className="min-w-0 flex-1 p-4 text-base font-bold text-gray-800 focus:outline-none sm:text-lg"
          />
          <button
            type="button"
            onClick={() => void search.handleSearch()}
            disabled={search.loading}
            className="w-full bg-indigo-600 px-5 py-4 text-base font-black text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-400 sm:w-auto sm:shrink-0 sm:px-8 sm:text-lg"
          >
            {search.loading ? "검색 중..." : "검색"}
          </button>
        </div>
        {search.recentSearches.length > 0 ? (
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {search.recentSearches.map((recentTag) => (
              <button
                type="button"
                key={recentTag}
                onClick={() => void search.handleSearch(recentTag)}
                className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-bold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50"
              >
                {recentTag}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section
        aria-label="검색 주기 안내"
        className="mb-12 w-full max-w-3xl rounded-3xl border-4 border-white bg-indigo-600 px-6 py-7 text-center text-white shadow-2xl"
      >
        <p className="text-2xl font-black sm:text-4xl">
          25경기마다 검색하는 것을 권장합니다
        </p>
        <p className="mt-3 text-sm font-bold text-indigo-100 sm:text-base">
          공식 전투 기록은 최근 최대 25경기만 불러올 수 있어, 자주 검색할수록 누적 통계가 더 정확해집니다.
        </p>
      </section>

      {search.error ? <Message text={search.error} tone="error" /> : null}
      {search.notice ? <Message text={search.notice} tone="notice" /> : null}

      {search.playerData ? (
        <div className="mt-8 flex w-full max-w-5xl flex-col items-center">
          <PlayerProfile
            playerData={search.playerData}
            nameColor={nameColor}
            streakCount={summary.streakCount}
            playTime={playTime}
          />
          {search.battleLog ? (
            <BattleLogList
              battleLog={search.battleLog}
              summary={summary}
              onSelectBattle={setSelectedBattle}
            />
          ) : null}
          <BrawlerList
            brawlers={search.playerData.brawlers}
            onSelectBrawler={setSelectedBrawler}
          />
        </div>
      ) : null}

      {selectedBrawler && recentBrawlerStat ? (
        <BrawlerDetailsModal
          brawler={selectedBrawler}
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
            void search.handleSearch(playerTag);
          }}
        />
      ) : null}

      <footer className="mt-20 flex w-full max-w-5xl flex-col items-center justify-between gap-4 border-t border-indigo-100 pb-10 pt-8 text-sm font-bold text-gray-500 sm:flex-row">
        <div>
          <p>© 2026 Brawl Stars Analytics. All rights reserved.</p>
          <p className="mt-1 text-xs font-medium text-gray-400">
            버그 제보 및 기능 건의: seunghunbag76@gmail.com
          </p>
        </div>
        <a
          href="https://github.com/psh1234567890/brawl_status_kr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 transition-colors hover:text-black hover:underline"
        >
          GitHub Repository
        </a>
      </footer>
    </main>
  );
}

function Message({ text, tone }: { text: string; tone: "error" | "notice" }) {
  return (
    <div className={`mb-8 rounded-lg border-l-4 px-6 py-4 font-bold shadow-md ${tone === "error" ? "border-red-500 bg-red-100 text-red-700" : "border-amber-500 bg-amber-50 text-amber-700"}`}>
      {text}
    </div>
  );
}
