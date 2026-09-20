"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrawlImage from "../../components/BrawlImage";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { mapToModeDict } from "../../constants/brawl";
import { generatedBrawlerImageIdByName } from "../../constants/generatedBrawlTranslations";
import { localizedHref, numberLocales, type Locale } from "../../i18n/config";
import { getMessages } from "../../i18n/messages";
import { translateBrawlerName, translateMapName, translateModeName } from "../../utils/brawlTranslations";

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
  const [selectedMode, setSelectedMode] = useState("젬 그랩");
  const [selectedMap, setSelectedMap] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [minPlays, setMinPlays] = useState(5);
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("ALL");
  const [sortMode, setSortMode] = useState<MetaSortMode>("SCORE");

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

        const maps = Object.keys(json);
        setData(json);
        const firstGemGrab = maps.find((mapName) => getMapMode(mapName) === "젬 그랩");
        const firstMap = firstGemGrab ?? maps[0] ?? "";
        setSelectedMap(firstMap);
        if (firstMap) setSelectedMode(getMapMode(firstMap));
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
    HIGH: locale === "ko" ? "높음만" : locale === "ja" ? "高のみ" : "High only",
    MEDIUM: locale === "ko" ? "보통만" : locale === "ja" ? "中のみ" : "Medium only",
    LOW: locale === "ko" ? "낮음만" : locale === "ja" ? "低のみ" : "Low only",
  };
  const sortModeLabels: Record<MetaSortMode, string> = {
    SCORE: copy.meta.scoreSort,
    WIN_RATE: copy.meta.winRateSort,
    PLAYS: copy.meta.playsSort,
  };

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
    setSelectedMode(modeName);
    setSelectedMap(Object.keys(data).find((mapName) => getMapMode(mapName) === modeName) ?? "");
    setShowAll(false);
  }

  function selectMap(mapName: string) {
    setSelectedMap(mapName);
    setShowAll(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6 sm:p-10">
      <header className="mb-10 text-center">
        <h1 className="mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-4xl font-black text-transparent drop-shadow-sm">
          {copy.meta.title}
        </h1>
        <p className="font-bold text-gray-500">{copy.meta.subtitle}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href={localizedHref(locale, "/")} className="inline-block rounded-full border border-indigo-200 bg-white px-6 py-2 font-bold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50">
            {copy.meta.back}
          </Link>
          <LanguageSwitcher locale={locale} />
        </div>
      </header>

      {loading ? (
        <div className="mt-20 rounded-full bg-white px-8 py-4 text-2xl font-black text-indigo-500 shadow-md">
          {copy.meta.loading}
        </div>
      ) : error ? (
        <div className="rounded-lg border-l-4 border-red-500 bg-red-100 px-6 py-4 font-bold text-red-700 shadow-md">
          {error}
        </div>
      ) : (
        <div className="flex w-full max-w-4xl flex-col items-center">
          <div className="mb-6 flex w-full flex-wrap justify-center gap-3 rounded-2xl bg-white/60 p-2 shadow-sm">
            {MODE_LIST.map((modeName) => (
              <button
                type="button"
                key={modeName}
                onClick={() => selectMode(modeName)}
                className={`whitespace-nowrap rounded-xl px-6 py-2.5 text-sm font-black transition-all ${
                  modeName === selectedMode
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white text-gray-500 hover:bg-gray-100"
                }`}
              >
                {translateMetaModeLabel(modeName, locale)}
              </button>
            ))}
          </div>

          <div className="mb-10 flex w-full flex-wrap justify-center gap-3">
            {filteredMaps.length ? (
              filteredMaps.map((mapName) => (
                <button
                  type="button"
                  key={mapName}
                  onClick={() => selectMap(mapName)}
                  className={`rounded-full border px-6 py-2.5 font-bold transition-all ${
                    mapName === selectedMap
                      ? "border-2 border-indigo-500 bg-white text-indigo-600 shadow-sm"
                      : "border-gray-200 bg-white/80 text-gray-500 hover:bg-white"
                  }`}
                >
                  {translateMapName(mapName, locale)}
                </button>
              ))
            ) : (
              <div className="rounded-full border border-dashed border-gray-300 bg-white/40 px-6 py-2 text-sm font-bold text-gray-400">
                {copy.meta.noMaps}
              </div>
            )}
          </div>

          {currentData.length ? (
            <section className="w-full max-w-3xl rounded-3xl border border-white bg-white/80 p-8 shadow-2xl backdrop-blur-md">
              <h2 className="mb-6 flex flex-col gap-2 border-b-2 border-indigo-100 pb-4 text-2xl font-black sm:flex-row sm:items-end sm:justify-between">
                <span>{translateMapName(selectedMap, locale)} {copy.meta.recommendation}</span>
                <span className="text-sm font-bold text-gray-400">{formatMinimumSample(locale, minPlays)}</span>
              </h2>

              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <FilterField label={copy.meta.minimumSample}>
                  <select
                    value={minPlays}
                    onChange={(event) => {
                      setMinPlays(Number(event.target.value));
                      setShowAll(false);
                    }}
                    className="w-full rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm font-black text-indigo-950 outline-none focus:border-indigo-400"
                  >
                    {MIN_PLAY_OPTIONS.map((value) => (
                      <option key={value} value={value}>{formatMinimumOption(locale, value)}</option>
                    ))}
                  </select>
                </FilterField>
                <FilterField label={copy.meta.confidence}>
                  <select
                    value={confidenceFilter}
                    onChange={(event) => {
                      setConfidenceFilter(event.target.value as ConfidenceFilter);
                      setShowAll(false);
                    }}
                    className="w-full rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm font-black text-indigo-950 outline-none focus:border-indigo-400"
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
                      setSortMode(event.target.value as MetaSortMode);
                      setShowAll(false);
                    }}
                    className="w-full rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm font-black text-indigo-950 outline-none focus:border-indigo-400"
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
                  value={formatCandidateCount(locale, filteredCurrentData.length)}
                  subValue={formatAllCandidateCount(locale, currentData.length)}
                />
                <SummaryStat label={copy.meta.aggregatedSamples} value={formatSampleCount(locale, mapSummary.totalSamples)} />
                <SummaryStat
                  label={copy.meta.highConfidence}
                  value={formatCandidateCount(locale, mapSummary.reliableCount)}
                  subValue={formatTopWinRate(locale, mapSummary.topWinRate)}
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
                    <article key={brawler.name} className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <span className="w-10 text-center text-3xl font-black text-indigo-200">#{index + 1}</span>
                        {brawlerId ? (
                          <BrawlImage
                            src={`https://cdn.brawlify.com/brawlers/borders/${brawlerId}.png`}
                            alt={displayName}
                            width={48}
                            height={48}
                            className="h-12 w-12 rounded-lg border-2 border-gray-200 bg-indigo-50 shadow-sm"
                          />
                        ) : (
                          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 font-black text-indigo-300">
                            {displayName.slice(0, 1)}
                          </span>
                        )}
                        <span className="text-2xl font-black text-gray-800">{displayName}</span>
                      </div>
                      <div className="flex w-full flex-col gap-3 border-t border-gray-100 pt-3 sm:w-[300px] sm:border-0 sm:pt-0">
                        <div className="flex justify-between gap-4 text-left sm:text-right">
                          <Stat label={copy.common.recommendationScore} value={formatScore(locale, brawler.score)} />
                          <Stat label={copy.common.winRate} value={formatWinRateSample(locale, brawler.winRate, brawler.plays)} />
                        </div>
                        <ConfidenceMeter stat={brawler} label={copy.meta.sampleConfidence} confidenceLabels={confidenceLabels} />
                      </div>
                    </article>
                  );
                })}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 px-4 py-8 text-center text-sm font-bold text-indigo-500">
                  {copy.meta.noCandidates}
                </p>
              )}

              {filteredCurrentData.length > DEFAULT_VISIBLE_COUNT ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAll((current) => !current)}
                    className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-indigo-700"
                  >
                    {formatShowAll(locale, showAll, filteredCurrentData.length)}
                  </button>
                </div>
              ) : null}
            </section>
          ) : (
            <div className="mt-10 w-full max-w-3xl rounded-full bg-white px-8 py-4 text-center text-xl font-bold text-gray-500 shadow-md">
              {copy.meta.insufficient}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function getMapMode(mapName: string) {
  return mapToModeDict[mapName] ?? "기타";
}

function SummaryStat({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div className="rounded-2xl bg-indigo-50 px-4 py-3">
      <span className="text-xs font-black text-indigo-500">{label}</span>
      <strong className="mt-1 block text-xl font-black text-indigo-950">{value}</strong>
      {subValue ? <span className="mt-1 block text-xs font-bold text-indigo-400">{subValue}</span> : null}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-black text-indigo-500">
      {label}
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="mb-1 text-xs font-bold text-gray-500">{label}</span>
      <span className="whitespace-nowrap text-base font-black text-indigo-600 sm:text-lg">{value}</span>
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
        <span className="text-xs font-bold text-gray-500">{label}</span>
        <span className={`rounded-full px-2 py-1 text-[11px] font-black ${confidenceBadgeClasses[stat.confidence]}`}>
          {confidenceLabel}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
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
  if (modeName === "기타") return locale === "ko" ? "기타" : locale === "ja" ? "その他" : "Other";
  return translateModeName(modeKeyByKoreanLabel[modeName] ?? modeName, locale);
}

function formatMinimumSample(locale: Locale, value: number) {
  if (locale === "ko") return `DB 전체 표본 기준: 최소 ${value}판 이상`;
  if (locale === "ja") return `DB全体サンプル基準：${value}戦以上`;
  return `Across all DB samples: at least ${value} battles`;
}

function formatMinimumOption(locale: Locale, value: number) {
  if (locale === "ko") return `${value}전 이상`;
  if (locale === "ja") return `${value}戦以上`;
  return `${value}+ battles`;
}

function formatCandidateCount(locale: Locale, value: number) {
  const formatted = value.toLocaleString(numberLocales[locale]);
  if (locale === "ko") return `${formatted}명`;
  if (locale === "ja") return `${formatted}体`;
  return formatted;
}

function formatAllCandidateCount(locale: Locale, value: number) {
  const count = formatCandidateCount(locale, value);
  if (locale === "ko") return `전체 ${count}`;
  if (locale === "ja") return `全体 ${count}`;
  return `${count} total`;
}

function formatSampleCount(locale: Locale, value: number) {
  const formatted = value.toLocaleString(numberLocales[locale]);
  if (locale === "ko") return `${formatted}건`;
  if (locale === "ja") return `${formatted}件`;
  return formatted;
}

function formatTopWinRate(locale: Locale, value: number) {
  if (locale === "ko") return `최고 승률 ${value}%`;
  if (locale === "ja") return `最高勝率 ${value}%`;
  return `Top win rate ${value}%`;
}

function formatScore(locale: Locale, value: number) {
  if (locale === "ko") return `${value}점`;
  if (locale === "ja") return `${value}点`;
  return String(value);
}

function formatWinRateSample(locale: Locale, winRate: number, plays: number) {
  if (locale === "ko") return `${winRate}% (${plays}전)`;
  if (locale === "ja") return `${winRate}% (${plays}戦)`;
  return `${winRate}% (${plays} battles)`;
}

function formatShowAll(locale: Locale, showAll: boolean, count: number) {
  if (showAll) {
    return locale === "ko" ? "상위 15개만 보기" : locale === "ja" ? "上位15件のみ表示" : "Show top 15 only";
  }
  const formatted = count.toLocaleString(numberLocales[locale]);
  if (locale === "ko") return `전체 후보 ${formatted}명 보기`;
  if (locale === "ja") return `候補 ${formatted}体をすべて表示`;
  return `Show all ${formatted} candidates`;
}
