"use client";

import { useEffect, useState } from "react";
import { brawlerDict } from "../constants/brawl";
import type { BrawlifyBrawler } from "../types/brawlify";

type CounterItem = {
  brawler: string;
  plays: number | string;
  wins: number | string;
  winRate: number | string;
  score: number | string;
};

export default function CounterBrowser({ brawlers }: { brawlers: BrawlifyBrawler[] }) {
  const released = brawlers.filter((brawler) => brawler.released !== false);
  const [selected, setSelected] = useState(released[0]?.name ?? "");
  const [items, setItems] = useState<CounterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    fetch(`/api/meta/counters?brawler=${encodeURIComponent(selected)}`)
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { items?: CounterItem[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "카운터를 불러오지 못했습니다.");
        if (alive) setItems(data.items ?? []);
      })
      .catch((requestError) => {
        if (alive) {
          setItems([]);
          setError(requestError instanceof Error ? requestError.message : "카운터를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selected]);

  function selectBrawler(value: string) {
    setLoading(true);
    setError("");
    setSelected(value);
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border border-white bg-white p-4 shadow-sm">
        <select
          value={selected}
          onChange={(event) => selectBrawler(event.target.value)}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-indigo-400 sm:max-w-sm"
        >
          {released.map((brawler) => (
            <option key={brawler.id} value={brawler.name}>
              {brawlerDict[brawler.name.toUpperCase()] ?? brawler.name}
            </option>
          ))}
        </select>
      </section>

      {loading ? (
        <div className="rounded-lg bg-white p-8 text-center text-lg font-black text-indigo-600 shadow-sm">
          카운터를 계산하는 중...
        </div>
      ) : error ? (
        <div className="rounded-lg border-l-4 border-red-500 bg-red-100 p-5 font-bold text-red-700">
          {error}
        </div>
      ) : items.length ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <article key={item.brawler} className="rounded-lg border border-white bg-white p-5 shadow-sm">
              <p className="text-xs font-black text-indigo-300">#{index + 1}</p>
              <h2 className="mt-1 text-xl font-black text-gray-900">
                {brawlerDict[item.brawler] ?? item.brawler}
              </h2>
              <p className="mt-3 text-sm font-bold text-gray-500">
                선택 브롤러를 상대로 {item.winRate}% 승률
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <Metric label="추천 점수" value={String(item.score)} />
                <Metric label="표본" value={`${item.plays}전`} />
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-indigo-200 bg-white/70 p-8 text-center text-sm font-bold text-gray-500">
          아직 충분한 카운터 표본이 없습니다.
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
