"use client";

import { useEffect, useMemo, useState } from "react";
import { numberLocales, type Locale } from "../i18n/config";
import { getMessages } from "../i18n/messages";
import type { BrawlifyBrawler } from "../types/brawlify";
import type { RankingItem, RankingsResponse } from "../types/brawl";
import { getClubBadgeUrl, getPlayerIconUrl } from "../utils/brawlAssets";
import { translateBrawlerName } from "../utils/brawlTranslations";
import BrawlImage from "./BrawlImage";

type RankingType = "players" | "clubs" | "brawlers";

async function fetchRankings(
  type: RankingType,
  country: string,
  brawlerId: string,
  errorText: string,
) {
  const params = new URLSearchParams({ type, country });
  if (type === "brawlers") params.set("brawlerId", brawlerId);
  const response = await fetch(`/api/rankings?${params}`);
  const data = (await response.json().catch(() => ({}))) as RankingsResponse & {
    error?: string;
  };
  if (!response.ok) throw new Error(errorText);
  return data.items ?? [];
}

export default function RankingsBrowser({
  brawlers,
  locale = "ko",
}: {
  brawlers: BrawlifyBrawler[];
  locale?: Locale;
}) {
  const copy = getMessages(locale);
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
    fetchRankings(type, country, brawlerId, copy.rankings.error)
      .then((nextItems) => {
        if (alive) setItems(nextItems);
      })
      .catch((requestError) => {
        if (alive) {
          setItems([]);
          setError(requestError instanceof Error ? requestError.message : copy.rankings.error);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [brawlerId, copy.rankings.error, country, type]);

  function beginReload() {
    setLoading(true);
    setError("");
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <select
          aria-label={copy.rankings.type}
          value={type}
          onChange={(event) => {
            beginReload();
            setType(event.target.value as RankingType);
          }}
          className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-400"
        >
          <option value="players">{copy.rankings.players}</option>
          <option value="clubs">{copy.rankings.clubs}</option>
          <option value="brawlers">{copy.rankings.brawlers}</option>
        </select>
        <select
          aria-label={copy.rankings.country}
          value={country}
          onChange={(event) => {
            beginReload();
            setCountry(event.target.value);
          }}
          className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-400"
        >
          <option value="global">{copy.rankings.global}</option>
          <option value="kr">{copy.rankings.korea}</option>
          <option value="jp">{copy.rankings.japan}</option>
          <option value="us">{copy.rankings.usa}</option>
        </select>
        <select
          aria-label={copy.rankings.brawler}
          value={brawlerId}
          onChange={(event) => {
            beginReload();
            setBrawlerId(event.target.value);
          }}
          disabled={type !== "brawlers"}
          className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400 md:col-span-2"
        >
          {releasedBrawlers.map((brawler) => (
            <option key={brawler.id} value={brawler.id}>
              {translateBrawlerName(brawler.name, locale)}
            </option>
          ))}
        </select>
      </section>

      {loading ? (
        <div className="rounded-lg bg-white p-8 text-center text-lg font-black text-blue-600 shadow-sm">
          {copy.rankings.loading}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-lg border-l-4 border-red-500 bg-red-100 p-5 font-bold text-red-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div role="status" className="rounded-lg border border-dashed border-blue-200 bg-white/70 p-8 text-center text-sm font-bold text-slate-500">
          {copy.rankings.empty}
        </div>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2">
            {items.slice(0, 100).map((item) => (
              <article key={`${item.rank}-${item.tag ?? item.name}`} className="flex items-center justify-between gap-3 rounded-lg bg-blue-50 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-10 text-center text-xl font-black text-blue-300">#{item.rank}</span>
                  {type === "clubs" && item.badgeId ? (
                    <BrawlImage
                      src={getClubBadgeUrl(item.badgeId)}
                      alt={locale === "ko" ? `${item.name} 클럽 배지` : item.name}
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
                    <p className="truncate font-black text-slate-900">{item.name}</p>
                    <p className="text-xs font-bold text-slate-500">
                      {item.club?.name ? `${item.club.name} · ` : ""}
                      {item.tag ?? `${item.memberCount ?? 0} ${copy.rankings.members}`}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-black text-blue-700">
                  {item.trophies.toLocaleString(numberLocales[locale])} {copy.rankings.trophies}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
