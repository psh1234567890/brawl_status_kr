"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrawlImage from "../../components/BrawlImage";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { mapToModeDict } from "../../constants/brawl";
import { generatedBrawlerImageIdByName } from "../../constants/generatedBrawlTranslations";
import { localizedHref, type Locale } from "../../i18n/config";
import {
  formatConfidenceOnly,
  formatMetaAllCandidates,
  formatMetaCandidateCount,
  formatMetaMinimumOption,
  formatMetaMinimumSample,
  formatMetaShowAll,
  formatMetaTopWinRate,
  formatMetaWinRateSample,
  formatOtherLabel,
  formatSamples,
} from "../../i18n/formatters";
import { getMessages } from "../../i18n/messages";
import { translateBrawlerName, translateMapName, translateModeName } from "../../utils/brawlTranslations";
import { replaceBrowserSearch, useBrowserSearch } from "../../utils/urlState";

const MODE_LIST = ["젬 그랩", "브롤 볼", "하이스트", "바운티", "핫 존", "녹아웃", "쇼다운", "기타"];
const DEFAULT_VISIBLE_COUNT = 15;
const MIN_PLAY_OPTIONS = [5, 10, 20, 50];

type SampleConfidence = "LOW" | "MEDIUM" | "HIGH";
type ConfidenceFilter = "ALL" | SampleConfidence;
type MetaSortMode = "SCORE" | "WIN_RATE" | "PLAYS";

type BrawlerMapStat = {
  id?: number;
  name: string;
  plays: number;
  wins: number;
  draws: number;
  winRate: number;
  score: number;
  confidence: SampleConfidence;
  confidenceScore: number;
};

type MapStatsResponse = Record<string, BrawlerMapStat[]>;

export default function MetaDashboard({ locale = "ko" }: { locale?: Locale }) {
  const copy = getMessages(locale);
  const [data, setData] = useState<MapStatsResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const search = useBrowserSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const requestedMin = Number(params.get("min"));
  const minPlays = MIN_PLAY_OPTIONS.includes(requestedMin) ? requestedMin : 5;
  const requestedConfidence = params.get("confidence") as ConfidenceFilter | null;
  const confidenceFilter =
    requestedConfidence && ["ALL", "LOW", "MEDIUM", "HIGH"].includes(requestedConfidence)
      ? requestedConfidence
      : "ALL";
  const requestedSort = params.get("sort") as MetaSortMode | null;
  const sortMode =
    requestedSort && ["SCORE", "WIN_RATE", "PLAYS"].includes(requestedSort)
      ? requestedSort
      : "SCORE";
  const showAll = params.get("all") === "1";

  useEffect(() => {
    const controller = new AbortController();

    async function loadMetaStats() {
      try {
        const response = await fetch("/api/meta", { signal: controller.signal });
        const json = (await response.json().catch(() => ({}))) as MapStatsResponse & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(locale === "ko" ? json.error ?? copy.meta.error : copy.meta.error);
        }

        setData(json);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : copy.meta.error,
        );
      } finally {
        setLoading(false);
      }
    }

    void loadMetaStats();
    return () => controller.abort();
  }, [copy.meta.error, locale]);

  const confidenceLabels: Record<SampleConfidence, string> = {
    HIGH: copy.meta.high,
    MEDIUM: copy.meta.medium,
    LOW: copy.meta.low,
  };
  const confidenceFilterLabels: Record<ConfidenceFilter, string> = {
    ALL: copy.meta.all,
    HIGH: formatConfidenceOnly(locale, "high", copy.meta.high),
    MEDIUM: formatConfidenceOnly(locale, "medium", copy.meta.medium),
    LOW: formatConfidenceOnly(locale, "low", copy.meta.low),
  };
  const sortModeLabels: Record<MetaSortMode, string> = {
    SCORE: copy.meta.scoreSort,
    WIN_RATE: copy.meta.winRateSort,
    PLAYS: copy.meta.playsSort,
  };

  const maps = Object.keys(data);
  const requestedMap = params.get("map");
  const requestedModeParam = params.get("mode");
  const requestedMode = MODE_LIST.includes(requestedModeParam ?? "")
    ? requestedModeParam ?? undefined
    : undefined;
  const selectedMap =
    (requestedMap && maps.includes(requestedMap) ? requestedMap : undefined) ??
    (requestedMode ? maps.find((mapName) => getMapMode(mapName) === requestedMode) : undefined) ??
    maps.find((mapName) => getMapMode(mapName) === "젬 그랩") ??
    maps[0] ??
    "";
  const selectedMode = selectedMap ? getMapMode(selectedMap) : requestedMode ?? "젬 그랩";

  const filteredMaps = useMemo(
    () => Object.keys(data).filter((mapName) => getMapMode(mapName) === selectedMode),
    [data, selectedMode],
  );
  const currentData = useMemo(
    () => (selectedMap ? data[selectedMap] ?? [] : []),
    [data, selectedMap],
  );
  const filteredCurrentData = useMemo(
    () =>
      currentData
        .filter((brawler) => brawler.plays >= minPlays)
        .filter((brawler) => confidenceFilter === "ALL" || brawler.confidence === confidenceFilter)
        .sort((left, right) => compareMetaStat(left, right, sortMode)),
    [confidenceFilter, currentData, minPlays, sortMode],
  );
  const visibleData = showAll ? filteredCurrentData : filteredCurrentData.slice(0, DEFAULT_VISIBLE_COUNT);
  const mapSummary = useMemo(() => {
    const totalSamples = filteredCurrentData.reduce((sum, brawler) => sum + brawler.plays, 0);
    const reliableCount = filteredCurrentData.filter((brawler) => brawler.confidence === "HIGH").length;
    const topWinRate = filteredCurrentData.reduce((max, brawler) => Math.max(max, brawler.winRate), 0);
    return { reliableCount, topWinRate, totalSamples };
  }, [filteredCurrentData]);

  function selectMode(modeName: string) {
    const nextMap = Object.keys(data).find((mapName) => getMapMode(mapName) === modeName) ?? "";
    syncMetaUrl({ mode: modeName, map: nextMap, showAll: false });
  }

  function selectMap(mapName: string) {
    syncMetaUrl({ mode: getMapMode(mapName), map: mapName, showAll: false });
  }

  function syncMetaUrl(
    overrides: Partial<{
      mode: string;
      map: string;
      minPlays: number;
      confidenceFilter: ConfidenceFilter;
      sortMode: MetaSortMode;
      showAll: boolean;
    }> = {},
  ) {
    const nextMode = overrides.mode ?? selectedMode;
    const nextMap = overrides.map ?? selectedMap;
    const nextMinPlays = overrides.minPlays ?? minPlays;
    const nextConfidence = overrides.confidenceFilter ?? confidenceFilter;
    const nextSort = overrides.sortMode ?? sortMode;
    const nextShowAll = overrides.showAll ?? showAll;
    replaceBrowserSearch({
      mode: nextMode || null,
      map: nextMap || null,
      min: nextMinPlays === 5 ? null : String(nextMinPlays),
      confidence: nextConfidence === "ALL" ? null : nextConfidence,
      sort: nextSort === "SCORE" ? null : nextSort,
      all: nextShowAll ? "1" : null,
    });
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] pb-12 text-slate-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:py-2">
          <div className="flex items-center justify-between gap-3">
            <Link href={localizedHref(locale, "/")} className="min-w-0">
              <span className="block text-lg font-black text-slate-950 sm:text-2xl">
                Brawl Status KR
              </span>
              <span className="block truncate text-xs font-bold text-slate-500 sm:text-sm">
                {copy.home.brandSubtitle}
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href={localizedHref(locale, "/")}
                className="hidden rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700 sm:inline-flex"
              >
                {copy.meta.back}
              </Link>
              <LanguageSwitcher locale={locale} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-blue-600">
              {copy.common.meta}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {copy.meta.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-slate-500 sm:text-base">
              {copy.meta.subtitle}
            </p>
          </div>
        </header>

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-5 rounded-xl border border-slate-200 bg-white px-8 py-8 text-center text-lg font-black text-blue-600 shadow-sm"
        >
          {copy.meta.loading}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-lg border-l-4 border-red-500 bg-red-100 px-6 py-4 font-bold text-red-700 shadow-md"
        >
          {error}
        </div>
      ) : (
        <div className="mt-5 flex w-full flex-col items-center">
          <div className="mb-4 flex w-full flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            {MODE_LIST.map((modeName) => (
              <button
                type="button"
                key={modeName}
                onClick={() => selectMode(modeName)}
                className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-black transition-colors ${
                  modeName === selectedMode
                    ? "bg-slate-950 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                {translateMetaModeLabel(modeName, locale)}
              </button>
            ))}
          </div>

          <div className="mb-5 flex w-full flex-wrap gap-2">
            {filteredMaps.length ? (
              filteredMaps.map((mapName) => (
                <button
                  type="button"
                  key={mapName}
                  onClick={() => selectMap(mapName)}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-black transition-colors ${
                    mapName === selectedMap
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                  }`}
                >
                  {translateMapName(mapName, locale)}
                </button>
              ))
            ) : (
              <div
                role="status"
                className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-400"
              >
                {copy.meta.noMaps}
              </div>
            )}
          </div>

          {currentData.length ? (
            <section className="w-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-6 flex flex-col gap-2 border-b border-slate-200 pb-4 text-2xl font-black text-slate-950 sm:flex-row sm:items-end sm:justify-between">
                <span>{translateMapName(selectedMap, locale)} {copy.meta.recommendation}</span>
                <span className="text-sm font-bold text-slate-400">{formatMetaMinimumSample(locale, minPlays)}</span>
              </h2>

              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <FilterField label={copy.meta.minimumSample}>
                  <select
                    value={minPlays}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      syncMetaUrl({ minPlays: value, showAll: false });
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-950 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    {MIN_PLAY_OPTIONS.map((value) => (
                      <option key={value} value={value}>{formatMetaMinimumOption(locale, value)}</option>
                    ))}
                  </select>
                </FilterField>
                <FilterField label={copy.meta.confidence}>
                  <select
                    value={confidenceFilter}
                    onChange={(event) => {
                      const value = event.target.value as ConfidenceFilter;
                      syncMetaUrl({ confidenceFilter: value, showAll: false });
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-950 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    {(Object.keys(confidenceFilterLabels) as ConfidenceFilter[]).map((value) => (
                      <option key={value} value={value}>{confidenceFilterLabels[value]}</option>
                    ))}
                  </select>
                </FilterField>
                <FilterField label={copy.meta.sort}>
                  <select
                    value={sortMode}
                    onChange={(event) => {
                      const value = event.target.value as MetaSortMode;
                      syncMetaUrl({ sortMode: value, showAll: false });
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-950 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    {(Object.keys(sortModeLabels) as MetaSortMode[]).map((value) => (
                      <option key={value} value={value}>{sortModeLabels[value]}</option>
                    ))}
                  </select>
                </FilterField>
              </div>

              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <SummaryStat
                  label={copy.meta.candidates}
                  value={formatMetaCandidateCount(locale, filteredCurrentData.length)}
                  subValue={formatMetaAllCandidates(locale, currentData.length)}
                />
                <SummaryStat label={copy.meta.aggregatedSamples} value={formatSamples(locale, mapSummary.totalSamples)} />
                <SummaryStat
                  label={copy.meta.highConfidence}
                  value={formatMetaCandidateCount(locale, mapSummary.reliableCount)}
                  subValue={formatMetaTopWinRate(locale, mapSummary.topWinRate)}
                />
              </div>

              {filteredCurrentData.length ? (
                <div className="flex flex-col gap-4">
                  {visibleData.map((brawler, index) => {
                  const displayName = translateBrawlerName(brawler.name, locale);
                  const brawlerId =
                    brawler.id ??
                    generatedBrawlerImageIdByName[brawler.name] ??
                    generatedBrawlerImageIdByName[brawler.name.toUpperCase()];
                  return (
                    <article key={brawler.name} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <span className="w-10 text-center text-3xl font-black text-blue-200">#{index + 1}</span>
                        {brawlerId ? (
                          <BrawlImage
                            src={`https://cdn.brawlify.com/brawlers/borders/${brawlerId}.png`}
                            alt={displayName}
                            width={48}
                            height={48}
                            className="h-12 w-12 rounded-lg border border-slate-200 bg-blue-50 shadow-sm"
                          />
                        ) : (
                          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 font-black text-blue-300">
                            {displayName.slice(0, 1)}
                          </span>
                        )}
                        <span className="text-2xl font-black text-slate-900">{displayName}</span>
                      </div>
                      <div className="flex w-full flex-col gap-3 border-t border-slate-100 pt-3 sm:w-[300px] sm:border-0 sm:pt-0">
                        <div className="flex justify-between gap-4 text-left sm:text-right">
                          <Stat label={copy.common.recommendationScore} value={formatScore(locale, brawler.score)} />
                          <Stat label={copy.common.winRate} value={formatMetaWinRateSample(locale, brawler.winRate, brawler.plays)} />
                        </div>
                        <ConfidenceMeter stat={brawler} label={copy.meta.sampleConfidence} confidenceLabels={confidenceLabels} />
                      </div>
                    </article>
                  );
                })}
                </div>
              ) : (
                <p
                  role="status"
                  className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500"
                >
                  {copy.meta.noCandidates}
                </p>
              )}

              {filteredCurrentData.length > DEFAULT_VISIBLE_COUNT ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !showAll;
                      syncMetaUrl({ showAll: next });
                    }}
                    className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700"
                  >
                    {formatMetaShowAll(locale, showAll, filteredCurrentData.length)}
                  </button>
                </div>
              ) : null}
            </section>
          ) : (
            <div
              role="status"
              className="w-full rounded-xl border border-slate-200 bg-white px-8 py-8 text-center text-lg font-bold text-slate-500 shadow-sm"
            >
              {copy.meta.insufficient}
            </div>
          )}
        </div>
      )}
      </div>
    </main>
  );
}

function getMapMode(mapName: string) {
  return mapToModeDict[mapName] ?? "기타";
}

function SummaryStat({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
      <span className="text-xs font-black text-blue-600">{label}</span>
      <strong className="mt-1 block text-xl font-black text-blue-950">{value}</strong>
      {subValue ? <span className="mt-1 block text-xs font-bold text-blue-500">{subValue}</span> : null}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-[0.05em] text-slate-500">
      {label}
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="mb-1 text-xs font-bold text-slate-500">{label}</span>
      <span className="whitespace-nowrap text-base font-black text-blue-700 sm:text-lg">{value}</span>
    </div>
  );
}

function ConfidenceMeter({
  stat,
  label,
  confidenceLabels,
}: {
  stat: BrawlerMapStat;
  label: string;
  confidenceLabels: Record<SampleConfidence, string>;
}) {
  const confidenceLabel = confidenceLabels[stat.confidence];
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-500">{label}</span>
        <span className={`rounded-full px-2 py-1 text-[11px] font-black ${confidenceBadgeClasses[stat.confidence]}`}>
          {confidenceLabel}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${confidenceBarClasses[stat.confidence]}`}
          style={{ width: `${stat.confidenceScore}%` }}
        />
      </div>
    </div>
  );
}

const confidenceBadgeClasses: Record<SampleConfidence, string> = {
  HIGH: "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-gray-100 text-gray-500",
};

const confidenceBarClasses: Record<SampleConfidence, string> = {
  HIGH: "bg-emerald-500",
  MEDIUM: "bg-amber-400",
  LOW: "bg-gray-300",
};

function compareMetaStat(left: BrawlerMapStat, right: BrawlerMapStat, mode: MetaSortMode) {
  if (mode === "WIN_RATE") {
    return right.winRate - left.winRate || right.plays - left.plays || right.score - left.score;
  }

  if (mode === "PLAYS") {
    return right.plays - left.plays || right.score - left.score || right.winRate - left.winRate;
  }

  return right.score - left.score || right.plays - left.plays || right.winRate - left.winRate;
}

const modeKeyByKoreanLabel: Record<string, string> = {
  "젬 그랩": "gemGrab",
  "브롤 볼": "brawlBall",
  "하이스트": "heist",
  "바운티": "bounty",
  "핫 존": "hotZone",
  "녹아웃": "knockout",
  "쇼다운": "soloShowdown",
};

function translateMetaModeLabel(modeName: string, locale: Locale) {
  if (modeName === "기타") return formatOtherLabel(locale);
  return translateModeName(modeKeyByKoreanLabel[modeName] ?? modeName, locale);
}

function formatScore(locale: Locale, value: number) {
  if (locale === "ko") return `${value}점`;
  if (locale === "ja") return `${value}点`;
  return String(value);
}
