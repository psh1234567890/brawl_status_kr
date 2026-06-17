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
  parseBattleTime,
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
    <section className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="battle-log-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="battle-log-title" className="text-lg font-black text-slate-950">
            전투 기록
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            최근 최대 25경기를 표시합니다. 친선 경기는 목록에만 표시됩니다.
          </p>
        </div>
        <span className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600">
          {filteredItems.length}/{displayItems.length} 표시
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SummaryCell label="승률" value={`${summary.winRate}%`} detail={`${summary.total}전`} />
        <SummaryCell label="승리" value={`${summary.wins}승`} detail={`${summary.defeats}패 ${summary.draws}무`} />
        <SummaryCell label="강세 모드" value={translateModeName(summary.bestMode)} detail={summary.maxModeWins > 0 ? `${summary.maxModeWins}승` : "부족"} />
      </div>

      <div className="mt-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="mt-4 flex max-h-[640px] flex-col gap-2 overflow-y-auto pr-1">
        {filteredItems.length ? (
          filteredItems.map((match) => {
            const info = getBattleResultInfo(match);
            const isRanked = checkIsRanked(match);
            const isFriendly = checkIsFriendly(match);
            const borderTone = info.isWin
              ? "border-l-blue-500"
              : info.isLoss
                ? "border-l-red-500"
                : "border-l-slate-400";

            return (
              <button
                type="button"
                key={`${match.battleTime}-${match.event.mode}-${match.event.map}`}
                onClick={() => onSelectBattle(match)}
                className={`grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-l-4 border-slate-200 bg-white p-3 text-left transition-colors hover:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-100 ${borderTone}`}
              >
                <span className="min-w-0">
                  <span className="mb-1 flex flex-wrap items-center gap-2">
                    <BattleTypeBadge friendly={isFriendly} ranked={isRanked} />
                    <span className="text-xs font-bold text-slate-400">{formatBattleTime(match.battleTime)}</span>
                  </span>
                  <span className="block truncate text-base font-black text-slate-950">
                    {translateModeName(match.event.mode) || "친선"} · {translateMapName(match.event.map) || "친선 경기"}
                  </span>
                </span>
                <span className="text-right">
                  <span className={`block text-xl font-black ${info.resultColor}`}>
                    {info.resultText}
                    {match.battle.rank ? <span className="ml-1 text-sm">#{match.battle.rank}</span> : null}
                  </span>
                  {match.battle.trophyChange !== undefined && !isRanked && !isFriendly ? (
                    <span className={`mt-1 block text-xs font-black ${match.battle.trophyChange > 0 ? "text-amber-600" : "text-red-600"}`}>
                      {match.battle.trophyChange > 0 ? "+" : ""}
                      {match.battle.trophyChange} 트로피
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-500">
            선택한 필터에 맞는 전투 기록이 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryCell({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="truncate text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-slate-950 sm:text-2xl">{value}</p>
      <p className="mt-1 truncate text-xs font-bold text-slate-500">{detail}</p>
    </div>
  );
}

function BattleTypeBadge({
  friendly,
  ranked,
}: {
  friendly: boolean;
  ranked: boolean;
}) {
  const label = friendly ? "친선" : ranked ? "경쟁전" : "일반";
  const className = friendly
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : ranked
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-black ${className}`}>
      {label}
    </span>
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
    <label className="flex min-w-0 flex-col gap-1 text-xs font-black text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}

function formatBattleTime(battleTime: string) {
  const date = parseBattleTime(battleTime);
  if (!date) return "시간 정보 없음";
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
