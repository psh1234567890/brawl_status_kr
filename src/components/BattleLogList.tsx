"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { BattleLogItem, BattleLogResponse, RecentBattleSummary } from "../types/brawl";
import {
  checkIsFriendly,
  checkIsRanked,
  getBattlePlayers,
  getBattleResultInfo,
  getNormalizedBattleResult,
  getPrimaryBrawler,
} from "../utils/brawlHelpers";
import {
  translateBrawlerName,
  translateMapName,
  translateModeName,
} from "../utils/brawlTranslations";

interface BattleLogListProps {
  battleLog: BattleLogResponse;
  summary: RecentBattleSummary;
  onSelectBattle: (match: BattleLogItem) => void;
}

export default function BattleLogList({
  battleLog,
  summary,
  onSelectBattle,
}: BattleLogListProps) {
  const displayItems = battleLog.items;
  const [resultFilter, setResultFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [mapFilter, setMapFilter] = useState("ALL");
  const [brawlerFilter, setBrawlerFilter] = useState("ALL");

  const filterOptions = useMemo(() => {
    const modes = new Set<string>();
    const maps = new Set<string>();
    const brawlers = new Set<string>();

    for (const match of displayItems) {
      if (match.event.mode) modes.add(match.event.mode);
      if (match.event.map) maps.add(match.event.map);
      for (const player of getBattlePlayers(match)) {
        const brawler = getPrimaryBrawler(player);
        if (brawler?.name) brawlers.add(brawler.name);
      }
    }

    return {
      modes: [...modes].sort((left, right) => translateModeName(left).localeCompare(translateModeName(right), "ko-KR")),
      maps: [...maps].sort((left, right) => translateMapName(left).localeCompare(translateMapName(right), "ko-KR")),
      brawlers: [...brawlers].sort((left, right) => translateBrawlerName(left).localeCompare(translateBrawlerName(right), "ko-KR")),
    };
  }, [displayItems]);

  const filteredItems = useMemo(
    () =>
      displayItems.filter((match) => {
        const result = getNormalizedBattleResult(match);
        const hasBrawler =
          brawlerFilter === "ALL" ||
          getBattlePlayers(match).some(
            (player) => getPrimaryBrawler(player)?.name === brawlerFilter,
          );

        return (
          (resultFilter === "ALL" || result === resultFilter) &&
          (modeFilter === "ALL" || match.event.mode === modeFilter) &&
          (mapFilter === "ALL" || match.event.map === mapFilter) &&
          hasBrawler
        );
      }),
    [brawlerFilter, displayItems, mapFilter, modeFilter, resultFilter],
  );

  return (
    <section className="mb-12 w-full" aria-labelledby="battle-log-title">
      <h3 id="battle-log-title" className="mb-6 border-l-8 border-indigo-500 pl-4 text-2xl font-black text-indigo-900">
        전체 기록 분석 ({summary.total}전)
      </h3>

      <div className="mb-10 flex w-full flex-col items-center justify-around gap-6 rounded-3xl border border-gray-100 bg-white p-8 shadow-xl transition-transform hover:-translate-y-1 md:flex-row">
        <div className="text-center">
          <span className="mb-2 block text-lg font-bold text-gray-500">최근 승률</span>
          <span className="text-5xl font-black text-indigo-600 drop-shadow-sm">
            {summary.winRate}%
          </span>
          <span className="mt-3 block rounded-full bg-gray-100 px-3 py-1 text-md font-bold text-gray-400">
            {summary.total}전 {summary.wins}승 {summary.defeats}패
          </span>
        </div>
        <div className="border-t-2 border-gray-200 pt-6 text-center md:border-l-2 md:border-t-0 md:pl-10 md:pt-0">
          <span className="mb-2 block text-lg font-bold text-gray-500">가장 많이 이긴 모드</span>
          <span className="text-4xl font-black text-gray-800">
            {translateModeName(summary.bestMode)}
          </span>
          <span className="mt-3 block text-md font-bold text-indigo-500">
            이 모드에서 {summary.maxModeWins}승
          </span>
        </div>
      </div>

      <div className="mb-6 flex items-end justify-between border-l-8 border-indigo-500 pl-4">
        <h3 className="text-2xl font-black text-indigo-900">모든 전투 기록 (최대 25게임)</h3>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-bold text-gray-500">
          {filteredItems.length}/{displayItems.length} 표시
        </span>
      </div>

      <div className="mb-4 grid gap-2 rounded-2xl border border-white bg-white/80 p-3 shadow-sm sm:grid-cols-4">
        <FilterSelect label="결과" value={resultFilter} onChange={setResultFilter}>
          <option value="ALL">전체 결과</option>
          <option value="victory">승리</option>
          <option value="defeat">패배</option>
          <option value="draw">무승부</option>
        </FilterSelect>
        <FilterSelect label="모드" value={modeFilter} onChange={setModeFilter}>
          <option value="ALL">전체 모드</option>
          {filterOptions.modes.map((mode) => (
            <option key={mode} value={mode}>{translateModeName(mode)}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="맵" value={mapFilter} onChange={setMapFilter}>
          <option value="ALL">전체 맵</option>
          {filterOptions.maps.map((map) => (
            <option key={map} value={map}>{translateMapName(map)}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="브롤러" value={brawlerFilter} onChange={setBrawlerFilter}>
          <option value="ALL">전체 브롤러</option>
          {filterOptions.brawlers.map((brawler) => (
            <option key={brawler} value={brawler}>{translateBrawlerName(brawler)}</option>
          ))}
        </FilterSelect>
      </div>

      <div className="custom-scrollbar mb-10 flex max-h-[600px] flex-col gap-4 overflow-y-auto pr-2">
        {filteredItems.map((match) => {
          const info = getBattleResultInfo(match);
          const isRanked = checkIsRanked(match);
          const isFriendly = checkIsFriendly(match);
          return (
            <button
              type="button"
              key={`${match.battleTime}-${match.event.mode}-${match.event.map}`}
              onClick={() => onSelectBattle(match)}
              className={`flex items-center justify-between rounded-2xl border-l-8 p-6 text-left shadow-md transition-transform hover:-translate-x-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${info.bgColor}`}
            >
              <span className="flex flex-col">
                <span className="mb-1 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black text-white ${isFriendly ? "bg-amber-500" : isRanked ? "bg-red-500" : "bg-green-500"}`}>
                    {isFriendly ? "친선전" : isRanked ? "경쟁전" : "일반 모드"}
                  </span>
                </span>
                <span className="mb-1 text-xl font-black text-gray-800">
                  {translateModeName(match.event.mode) || "친선"} -{" "}
                  {translateMapName(match.event.map) || "친선 경기"}
                </span>
              </span>
              <span className="flex items-center gap-4">
                {match.battle.trophyChange && !isRanked && !isFriendly ? (
                  <span className={`text-xl font-black ${match.battle.trophyChange > 0 ? "text-yellow-500" : "text-red-500"}`}>
                    {match.battle.trophyChange > 0 ? "+" : ""}
                    {match.battle.trophyChange}🏆
                  </span>
                ) : null}
                <span className={`text-3xl font-black drop-shadow-sm ${info.resultColor}`}>
                  {info.resultText}
                  {match.battle.rank ? <span className="ml-1 text-lg">({match.battle.rank}등)</span> : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-black text-gray-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-indigo-400"
      >
        {children}
      </select>
    </label>
  );
}
