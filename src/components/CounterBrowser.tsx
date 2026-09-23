"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "../i18n/config";
import { formatCounterWinRate } from "../i18n/formatters";
import { getMessages } from "../i18n/messages";
import type { BrawlifyBrawler } from "../types/brawlify";
import { translateBrawlerName } from "../utils/brawlTranslations";
import { replaceBrowserSearch, useBrowserSearch } from "../utils/urlState";

type CounterItem = {
  brawler: string;
  plays: number | string;
  wins: number | string;
  winRate: number | string;
  score: number | string;
};

type CounterResult = {
  brawler: string;
  items: CounterItem[];
  error: string;
};

export default function CounterBrowser({
  brawlers,
  locale = "ko",
}: {
  brawlers: BrawlifyBrawler[];
  locale?: Locale;
}) {
  const copy = getMessages(locale);
  const released = useMemo(
    () => brawlers.filter((brawler) => brawler.released !== false),
    [brawlers],
  );
  const catalogUnavailable = released.length === 0;
  const search = useBrowserSearch();
  const selected = useMemo(() => {
    const requested = new URLSearchParams(search).get("brawler");
    if (!requested) return released[0]?.name ?? "";
    return (
      released.find((brawler) => brawler.name.toUpperCase() === requested.toUpperCase())?.name ??
      released[0]?.name ??
      ""
    );
  }, [released, search]);
  const [result, setResult] = useState<CounterResult>({ brawler: "", items: [], error: "" });
  const loading = Boolean(selected && result.brawler !== selected);
  const items = result.brawler === selected ? result.items : [];
  const error = result.brawler === selected ? result.error : "";

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    fetch(`/api/meta/counters?brawler=${encodeURIComponent(selected)}`)
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { items?: CounterItem[]; error?: string };
        if (!response.ok) {
          throw new Error(locale === "ko" ? data.error ?? copy.counters.error : copy.counters.error);
        }
        if (alive) setResult({ brawler: selected, items: data.items ?? [], error: "" });
      })
      .catch((requestError) => {
        if (alive) {
          setResult({
            brawler: selected,
            items: [],
            error: requestError instanceof Error ? requestError.message : copy.counters.error,
          });
        }
      });
    return () => {
      alive = false;
    };
  }, [copy.counters.error, locale, selected]);

  function selectBrawler(value: string) {
    replaceBrowserSearch({ brawler: value });
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="counter-brawler" className="mb-2 block text-xs font-black uppercase tracking-[0.06em] text-blue-600">
          {copy.counters.select}
        </label>
        <select
          id="counter-brawler"
          value={selected}
          onChange={(event) => selectBrawler(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:max-w-sm"
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
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-slate-200 bg-white p-8 text-center text-lg font-black text-blue-600 shadow-sm"
        >
          {copy.counters.loading}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-lg border-l-4 border-red-500 bg-red-100 p-5 font-bold text-red-700">
          {error}
        </div>
      ) : items.length ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <article key={item.brawler} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black text-blue-300">#{index + 1}</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                {translateBrawlerName(item.brawler, locale)}
              </h2>
              <p className="mt-3 text-sm font-bold text-slate-500">
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
        <div
          role="status"
          className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500"
        >
          {copy.counters.empty}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-blue-50 p-3">
      <p className="text-xs font-black text-blue-500">{label}</p>
      <p className="mt-1 font-black text-blue-950">{value}</p>
    </div>
  );
}
