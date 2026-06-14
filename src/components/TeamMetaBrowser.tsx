"use client";

import { useEffect, useState } from "react";
import { mapDict } from "../constants/brawl";

type TeamComp = {
  map: string;
  team: string;
  plays: number | string;
  wins: number | string;
  winRate: number | string;
  score: number | string;
};

export default function TeamMetaBrowser() {
  const [mapName, setMapName] = useState("");
  const [items, setItems] = useState<TeamComp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams();
    if (mapName) params.set("map", mapName);
    fetch(`/api/meta/teams?${params}`)
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { items?: TeamComp[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "팀 조합을 불러오지 못했습니다.");
        if (alive) setItems(data.items ?? []);
      })
      .catch((requestError) => {
        if (alive) {
          setItems([]);
          setError(requestError instanceof Error ? requestError.message : "팀 조합을 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [mapName]);

  function selectMap(value: string) {
    setLoading(true);
    setError("");
    setMapName(value);
  }

  const maps = [...new Set(items.map((item) => item.map))].sort();

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border border-white bg-white p-4 shadow-sm">
        <select
          value={mapName}
          onChange={(event) => selectMap(event.target.value)}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-indigo-400 sm:max-w-sm"
        >
          <option value="">전체 맵</option>
          {maps.map((map) => (
            <option key={map} value={map}>{mapDict[map] ?? map}</option>
          ))}
        </select>
      </section>

      {loading ? (
        <div className="rounded-lg bg-white p-8 text-center text-lg font-black text-indigo-600 shadow-sm">
          팀 조합을 계산하는 중...
        </div>
      ) : error ? (
        <div className="rounded-lg border-l-4 border-red-500 bg-red-100 p-5 font-bold text-red-700">
          {error}
        </div>
      ) : items.length ? (
        <section className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <article key={`${item.map}-${item.team}`} className="rounded-lg border border-white bg-white p-5 shadow-sm">
              <p className="text-xs font-black text-indigo-500">{mapDict[item.map] ?? item.map}</p>
              <h2 className="mt-1 text-xl font-black text-gray-900">{item.team}</h2>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Metric label="추천 점수" value={String(item.score)} />
                <Metric label="승률" value={`${item.winRate}%`} />
                <Metric label="표본" value={`${item.plays}전`} />
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-indigo-200 bg-white/70 p-8 text-center text-sm font-bold text-gray-500">
          아직 충분한 팀 조합 표본이 없습니다.
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-indigo-50 p-3">
      <p className="text-xs font-black text-indigo-400">{label}</p>
      <p className="mt-1 font-black text-indigo-900">{value}</p>
    </div>
  );
}
