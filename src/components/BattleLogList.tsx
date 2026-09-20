"use client";

import { useMemo, useState, type ReactNode } from "react";
import { numberLocales, type Locale } from "../i18n/config";
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
  locale?: Locale;
}

export default function BattleLogList({
  battleLog,
  summary,
  onSelectBattle,
  locale = "ko",
}: BattleLogListProps) {
  const copy = getBattleLogCopy(locale);
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
      modes: [...modes].sort((left, right) => translateModeName(left, locale).localeCompare(translateModeName(right, locale), numberLocales[locale])),
      maps: [...maps].sort((left, right) => translateMapName(left, locale).localeCompare(translateMapName(right, locale), numberLocales[locale])),
      brawlers: [...brawlers].sort((left, right) => translateBrawlerName(left, locale).localeCompare(translateBrawlerName(right, locale), numberLocales[locale])),
    };
  }, [displayItems, locale]);

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
            {copy.title}
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {copy.description}
          </p>
        </div>
        <span className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600">
          {filteredItems.length}/{displayItems.length} {copy.shown}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SummaryCell label={copy.winRate} value={`${summary.winRate}%`} detail={formatBattles(locale, summary.total)} />
        <SummaryCell label={copy.wins} value={formatWins(locale, summary.wins)} detail={formatLossDraw(locale, summary.defeats, summary.draws)} />
        <SummaryCell label={copy.bestMode} value={translateModeName(summary.bestMode, locale)} detail={summary.maxModeWins > 0 ? formatWins(locale, summary.maxModeWins) : copy.notEnough} />
      </div>

      <div className="mt-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect label={copy.result} value={resultFilter} onChange={setResultFilter}>
          <option value="ALL">{copy.allResults}</option>
          <option value="victory">{copy.victory}</option>
          <option value="defeat">{copy.defeat}</option>
          <option value="draw">{copy.draw}</option>
        </FilterSelect>
        <FilterSelect label={copy.mode} value={modeFilter} onChange={setModeFilter}>
          <option value="ALL">{copy.allModes}</option>
          {filterOptions.modes.map((mode) => (
            <option key={mode} value={mode}>{translateModeName(mode, locale)}</option>
          ))}
        </FilterSelect>
        <FilterSelect label={copy.map} value={mapFilter} onChange={setMapFilter}>
          <option value="ALL">{copy.allMaps}</option>
          {filterOptions.maps.map((map) => (
            <option key={map} value={map}>{translateMapName(map, locale)}</option>
          ))}
        </FilterSelect>
        <FilterSelect label={copy.brawler} value={brawlerFilter} onChange={setBrawlerFilter}>
          <option value="ALL">{copy.allBrawlers}</option>
          {filterOptions.brawlers.map((brawler) => (
            <option key={brawler} value={brawler}>{translateBrawlerName(brawler, locale)}</option>
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
                    <BattleTypeBadge friendly={isFriendly} ranked={isRanked} locale={locale} />
                    <span className="text-xs font-bold text-slate-400">{formatBattleTime(match.battleTime, locale)}</span>
                  </span>
                  <span className="block truncate text-base font-black text-slate-950">
                    {translateModeName(match.event.mode, locale) || copy.friendly} · {translateMapName(match.event.map, locale) || copy.friendlyBattle}
                  </span>
                </span>
                <span className="text-right">
                  <span className={`block text-xl font-black ${info.resultColor}`}>
                    {formatOutcome(getNormalizedBattleResult(match), locale)}
                    {match.battle.rank ? <span className="ml-1 text-sm">#{match.battle.rank}</span> : null}
                  </span>
                  {match.battle.trophyChange !== undefined && !isRanked && !isFriendly ? (
                    <span className={`mt-1 block text-xs font-black ${match.battle.trophyChange > 0 ? "text-amber-600" : "text-red-600"}`}>
                      {match.battle.trophyChange > 0 ? "+" : ""}
                      {match.battle.trophyChange} {copy.trophies}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-500">
            {copy.empty}
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
  locale,
}: {
  friendly: boolean;
  ranked: boolean;
  locale: Locale;
}) {
  const copy = getBattleLogCopy(locale);
  const label = friendly ? copy.friendly : ranked ? copy.ranked : copy.normal;
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

function formatBattleTime(battleTime: string, locale: Locale) {
  const date = parseBattleTime(battleTime);
  if (!date) return getBattleLogCopy(locale).noTime;
  return date.toLocaleString(numberLocales[locale], {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatOutcome(outcome: "victory" | "defeat" | "draw", locale: Locale) {
  const copy = getBattleLogCopy(locale);
  return outcome === "victory" ? copy.victory : outcome === "defeat" ? copy.defeat : copy.draw;
}

function formatBattles(locale: Locale, value: number) {
  return locale === "ko" ? `${value}전` : locale === "ja" ? `${value}戦` : `${value} battles`;
}

function formatWins(locale: Locale, value: number) {
  return locale === "ko" ? `${value}승` : locale === "ja" ? `${value}勝` : `${value} wins`;
}

function formatLossDraw(locale: Locale, losses: number, draws: number) {
  return locale === "ko" ? `${losses}패 ${draws}무` : locale === "ja" ? `${losses}敗 ${draws}分` : `${losses}L ${draws}D`;
}

function getBattleLogCopy(locale: Locale) {
  if (locale === "en") return {
    title: "Battle History", description: "Shows up to the latest 25 battles. Friendly battles appear only in the list.", shown: "shown",
    winRate: "Win rate", wins: "Wins", bestMode: "Best mode", notEnough: "Not enough data", result: "Result", allResults: "All results",
    victory: "Victory", defeat: "Defeat", draw: "Draw", mode: "Mode", allModes: "All modes", map: "Map", allMaps: "All maps",
    brawler: "Brawler", allBrawlers: "All brawlers", friendly: "Friendly", friendlyBattle: "Friendly battle", ranked: "Ranked", normal: "Normal",
    trophies: "trophies", empty: "No battles match the selected filters.", noTime: "Time unavailable",
  } as const;
  if (locale === "ja") return {
    title: "バトル履歴", description: "直近最大25戦を表示します。フレンドバトルは一覧にのみ表示されます。", shown: "表示",
    winRate: "勝率", wins: "勝利", bestMode: "得意モード", notEnough: "データ不足", result: "結果", allResults: "すべての結果",
    victory: "勝利", defeat: "敗北", draw: "引き分け", mode: "モード", allModes: "すべてのモード", map: "マップ", allMaps: "すべてのマップ",
    brawler: "ブロウラー", allBrawlers: "すべてのブロウラー", friendly: "フレンド", friendlyBattle: "フレンドバトル", ranked: "ランク", normal: "通常",
    trophies: "トロフィー", empty: "選択したフィルターに一致するバトル履歴がありません。", noTime: "時間情報なし",
  } as const;
  return {
    title: "전투 기록", description: "최근 최대 25경기를 표시합니다. 친선 경기는 목록에만 표시됩니다.", shown: "표시",
    winRate: "승률", wins: "승리", bestMode: "강세 모드", notEnough: "부족", result: "결과", allResults: "전체 결과",
    victory: "승리", defeat: "패배", draw: "무승부", mode: "모드", allModes: "전체 모드", map: "맵", allMaps: "전체 맵",
    brawler: "브롤러", allBrawlers: "전체 브롤러", friendly: "친선", friendlyBattle: "친선 경기", ranked: "경쟁전", normal: "일반",
    trophies: "트로피", empty: "선택한 필터에 맞는 전투 기록이 없습니다.", noTime: "시간 정보 없음",
  } as const;
}
