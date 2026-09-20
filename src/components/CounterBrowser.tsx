"use client";

import { useEffect, useState } from "react";
import type { Locale } from "../i18n/config";
import { formatCounterWinRate } from "../i18n/formatters";
import { getMessages } from "../i18n/messages";
import type { BrawlifyBrawler } from "../types/brawlify";
import { translateBrawlerName } from "../utils/brawlTranslations";

type CounterItem = {
  brawler: string;
  plays: number | string;
  wins: number | string;
  winRate: number | string;
  score: number | string;
};

export default function CounterBrowser({
  brawlers,
  locale = "ko",
}: {
  brawlers: BrawlifyBrawler[];
  locale?: Locale;
}) {
  const copy = getMessages(locale);
  const released = brawlers.filter((brawler) => brawler.released !== false);
  const catalogUnavailable = released.length === 0;
  const [selected, setSelected] = useState(released[0]?.name ?? "");
  const [items, setItems] = useState<CounterItem[]>([]);
  const [loading, setLoading] = useState(() => Boolean(released[0]?.name));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    fetch(`/api/meta/counters?brawler=${encodeURIComponent(selected)}`)
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { items?: CounterItem[]; error?: string };
        if (!response.ok) {
          throw new Error(locale === "ko" ? data.error ?? copy.counters.error : copy.counters.error);
        }
        if (alive) setItems(data.items ?? []);
      })
      .catch((requestError) => {
        if (alive) {
          setItems([]);
          setError(requestError instanceof Error ? requestError.message : copy.counters.error);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [copy.counters.error, locale, selected]);

  function selectBrawler(value: string) {
    setLoading(true);
    setError("");
    setSelected(value);
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border border-white bg-white p-4 shadow-sm">
        <label htmlFor="counter-brawler" className="mb-2 block text-xs font-black text-indigo-500">
          {copy.counters.select}
        </label>
        <select
          id="counter-brawler"
          value={selected}
          onChange={(event) => selectBrawler(event.target.value)}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-indigo-400 sm:max-w-sm"
        >
          {released.map((brawler) => (
            <option key={brawler.id} value={brawler.name}>
              {translateBrawlerName(brawler.name, locale)}
            </option>
          ))}
        </select>
      </section>

      {catalogUnavailable ? (
        <div role="status" className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-8 text-center text-sm font-bold text-amber-700">
          {copy.counters.catalogUnavailable}
        </div>
      ) : loading ? (
        <div className="rounded-lg bg-white p-8 text-center text-lg font-black text-indigo-600 shadow-sm">
          {copy.counters.loading}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-lg border-l-4 border-red-500 bg-red-100 p-5 font-bold text-red-700">
          {error}
        </div>
      ) : items.length ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <article key={item.brawler} className="rounded-lg border border-white bg-white p-5 shadow-sm">
              <p className="text-xs font-black text-indigo-300">#{index + 1}</p>
              <h2 className="mt-1 text-xl font-black text-gray-900">
                {translateBrawlerName(item.brawler, locale)}
              </h2>
              <p className="mt-3 text-sm font-bold text-gray-500">
                {formatCounterWinRate(locale, Number(item.winRate))}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <Metric label={copy.common.recommendationScore} value={String(item.score)} />
                <Metric label={copy.common.sample} value={String(item.plays)} />
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-indigo-200 bg-white/70 p-8 text-center text-sm font-bold text-gray-500">
          {copy.counters.empty}
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
