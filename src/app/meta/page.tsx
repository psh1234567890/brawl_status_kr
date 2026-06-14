"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrawlImage from "../../components/BrawlImage";
import { mapToModeDict } from "../../constants/brawl";
import { generatedBrawlerImageIdByName } from "../../constants/generatedBrawlTranslations";
import { translateBrawlerName, translateMapName } from "../../utils/brawlTranslations";

const MODE_LIST = ["젬 그랩", "브롤 볼", "하이스트", "바운티", "핫 존", "녹아웃", "쇼다운", "기타"];

type BrawlerMapStat = {
  id?: number;
  name: string;
  plays: number;
  wins: number;
  winRate: number;
  score: number;
};

type MapStatsResponse = Record<string, BrawlerMapStat[]>;

export default function MetaDashboard() {
  const [data, setData] = useState<MapStatsResponse>({});
  const [selectedMode, setSelectedMode] = useState("젬 그랩");
  const [selectedMap, setSelectedMap] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadMetaStats() {
      try {
        const response = await fetch("/api/meta", { signal: controller.signal });
        const json = (await response.json().catch(() => ({}))) as MapStatsResponse & {
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "메타 통계를 불러오지 못했습니다.");

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
            : "메타 통계를 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadMetaStats();
    return () => controller.abort();
  }, []);

  const filteredMaps = useMemo(
    () => Object.keys(data).filter((mapName) => getMapMode(mapName) === selectedMode),
    [data, selectedMode],
  );
  const currentData = selectedMap ? data[selectedMap] ?? [] : [];

  function selectMode(modeName: string) {
    setSelectedMode(modeName);
    setSelectedMap(Object.keys(data).find((mapName) => getMapMode(mapName) === modeName) ?? "");
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6 sm:p-10">
      <header className="mb-10 text-center">
        <h1 className="mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-4xl font-black text-transparent drop-shadow-sm">
          맵별 추천 브롤러
        </h1>
        <p className="font-bold text-gray-500">전체 저장 전투 표본 기반 가중 승률 추천</p>
        <Link href="/" className="mt-6 inline-block rounded-full border border-indigo-200 bg-white px-6 py-2 font-bold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50">
          전적 검색으로 돌아가기
        </Link>
      </header>

      {loading ? (
        <div className="mt-20 rounded-full bg-white px-8 py-4 text-2xl font-black text-indigo-500 shadow-md">
          메타 통계를 불러오는 중...
        </div>
      ) : error ? (
        <div className="rounded-lg border-l-4 border-red-500 bg-red-100 px-6 py-4 font-bold text-red-700 shadow-md">
          {error}
        </div>
      ) : (
        <div className="flex w-full max-w-4xl flex-col items-center">
          <div className="mb-6 flex w-full justify-start gap-3 overflow-x-auto rounded-2xl bg-white/60 p-2 shadow-sm sm:justify-center">
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
                {modeName}
              </button>
            ))}
          </div>

          <div className="mb-10 flex w-full flex-wrap justify-center gap-3">
            {filteredMaps.length ? (
              filteredMaps.map((mapName) => (
                <button
                  type="button"
                  key={mapName}
                  onClick={() => setSelectedMap(mapName)}
                  className={`rounded-full border px-6 py-2.5 font-bold transition-all ${
                    mapName === selectedMap
                      ? "border-2 border-indigo-500 bg-white text-indigo-600 shadow-sm"
                      : "border-gray-200 bg-white/80 text-gray-500 hover:bg-white"
                  }`}
                >
                  {translateMapName(mapName)}
                </button>
              ))
            ) : (
              <div className="rounded-full border border-dashed border-gray-300 bg-white/40 px-6 py-2 text-sm font-bold text-gray-400">
                아직 저장된 맵 데이터가 없습니다.
              </div>
            )}
          </div>

          {currentData.length ? (
            <section className="w-full max-w-3xl rounded-3xl border border-white bg-white/80 p-8 shadow-2xl backdrop-blur-md">
              <h2 className="mb-6 flex flex-col gap-2 border-b-2 border-indigo-100 pb-4 text-2xl font-black sm:flex-row sm:items-end sm:justify-between">
                <span>{translateMapName(selectedMap)} 추천</span>
                <span className="text-sm font-bold text-gray-400">전체 저장 전투 표본 기준: 최소 5판 이상</span>
              </h2>
              <div className="flex flex-col gap-4">
                {currentData.map((brawler, index) => {
                  const displayName = translateBrawlerName(brawler.name);
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
                      <div className="flex w-full justify-between gap-4 border-t border-gray-100 pt-3 text-left sm:w-auto sm:border-0 sm:pt-0 sm:text-right">
                        <Stat label="추천 점수" value={`${brawler.score}점`} />
                        <Stat label="실제 승률" value={`${brawler.winRate}% (${brawler.plays}전)`} />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="mt-10 w-full max-w-3xl rounded-full bg-white px-8 py-4 text-center text-xl font-bold text-gray-500 shadow-md">
              선택한 맵에는 아직 충분한 표본이 없습니다.
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="mb-1 text-xs font-bold text-gray-500">{label}</span>
      <span className="whitespace-nowrap text-base font-black text-indigo-600 sm:text-lg">{value}</span>
    </div>
  );
}
