"use client";

import { useEffect, useMemo, useState } from "react";
import type { BrawlifyBrawler } from "../types/brawlify";
import type { RankingItem, RankingsResponse } from "../types/brawl";
import { getClubBadgeUrl, getPlayerIconUrl } from "../utils/brawlAssets";
import { translateBrawlerName } from "../utils/brawlTranslations";
import BrawlImage from "./BrawlImage";

type RankingType = "players" | "clubs" | "brawlers";

async function fetchRankings(type: RankingType, country: string, brawlerId: string) {
  const params = new URLSearchParams({ type, country });
  if (type === "brawlers") params.set("brawlerId", brawlerId);
  const response = await fetch(`/api/rankings?${params}`);
  const data = (await response.json().catch(() => ({}))) as RankingsResponse & {
    error?: string;
  };
  if (!response.ok) throw new Error(data.error ?? "랭킹 정보를 불러오지 못했습니다.");
  return data.items ?? [];
}

export default function RankingsBrowser({ brawlers }: { brawlers: BrawlifyBrawler[] }) {
  const [type, setType] = useState<RankingType>("players");
  const [country, setCountry] = useState("global");
  const [brawlerId, setBrawlerId] = useState(String(brawlers[0]?.id ?? ""));
  const [items, setItems] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const releasedBrawlers = useMemo(
    () => brawlers.filter((brawler) => brawler.released !== false),
    [brawlers],
  );

  useEffect(() => {
    let alive = true;
    fetchRankings(type, country, brawlerId)
      .then((nextItems) => {
        if (alive) setItems(nextItems);
      })
      .catch((requestError) => {
        if (alive) {
          setItems([]);
          setError(requestError instanceof Error ? requestError.message : "랭킹 정보를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [brawlerId, country, type]);

  function beginReload() {
    setLoading(true);
    setError("");
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-3 rounded-lg border border-white bg-white p-4 shadow-sm md:grid-cols-4">
        <select
          value={type}
          onChange={(event) => {
            beginReload();
            setType(event.target.value as RankingType);
          }}
          className="rounded-md border border-gray-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-indigo-400"
        >
          <option value="players">플레이어 랭킹</option>
          <option value="clubs">클럽 랭킹</option>
          <option value="brawlers">브롤러 랭킹</option>
        </select>
        <select
          value={country}
          onChange={(event) => {
            beginReload();
            setCountry(event.target.value);
          }}
          className="rounded-md border border-gray-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-indigo-400"
        >
          <option value="global">글로벌</option>
          <option value="kr">한국</option>
          <option value="jp">일본</option>
          <option value="us">미국</option>
        </select>
        <select
          value={brawlerId}
          onChange={(event) => {
            beginReload();
            setBrawlerId(event.target.value);
          }}
          disabled={type !== "brawlers"}
          className="rounded-md border border-gray-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-indigo-400 disabled:bg-gray-100 disabled:text-gray-400 md:col-span-2"
        >
          {releasedBrawlers.map((brawler) => (
            <option key={brawler.id} value={brawler.id}>
              {translateBrawlerName(brawler.name)}
            </option>
          ))}
        </select>
      </section>

      {loading ? (
        <div className="rounded-lg bg-white p-8 text-center text-lg font-black text-indigo-600 shadow-sm">
          랭킹을 불러오는 중...
        </div>
      ) : error ? (
        <div className="rounded-lg border-l-4 border-red-500 bg-red-100 p-5 font-bold text-red-700">
          {error}
        </div>
      ) : (
        <section className="rounded-lg border border-white bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2">
            {items.slice(0, 100).map((item) => (
              <article key={`${item.rank}-${item.tag ?? item.name}`} className="flex items-center justify-between gap-3 rounded-lg bg-indigo-50 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-10 text-center text-xl font-black text-indigo-300">#{item.rank}</span>
                  {type === "clubs" && item.badgeId ? (
                    <BrawlImage
                      src={getClubBadgeUrl(item.badgeId)}
                      alt={`${item.name} 클럽 배지`}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-md bg-white p-1"
                      fallbackText={item.name.slice(0, 1)}
                    />
                  ) : item.icon?.id ? (
                    <BrawlImage
                      src={getPlayerIconUrl(item.icon.id)}
                      alt={item.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-md"
                      fallbackText={item.name.slice(0, 1)}
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate font-black text-gray-900">{item.name}</p>
                    <p className="text-xs font-bold text-gray-500">
                      {item.club?.name ? `${item.club.name} · ` : ""}
                      {item.tag ?? `${item.memberCount ?? 0}명`}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-black text-indigo-700">
                  {item.trophies.toLocaleString("ko-KR")} 트로피
                </span>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
