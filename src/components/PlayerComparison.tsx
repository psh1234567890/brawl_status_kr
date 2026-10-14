"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { rankDict } from "../constants/brawl";
import { numberLocales, type Locale } from "../i18n/config";
import { getComparisonMessages } from "../i18n/playerComparisonMessages";
import type { PlayerData } from "../types/brawl";
import { getPlayerIconUrl } from "../utils/brawlAssets";
import { translateBrawlerName } from "../utils/brawlTranslations";
import { comparisonPath, higherValueSide, summarizeComparedPlayer, validatedComparisonTags } from "../utils/playerComparison";
import BrawlImage from "./BrawlImage";
import StatSymbol from "./StatSymbol";
import { sendUsageEvent } from "../utils/clientUsage";

type Result = { state: "idle" | "loading" } | { state: "error"; code: number | null } | { state: "ready"; player: PlayerData };
const idle: Result = { state: "idle" };

async function fetchPlayer(tag: string, signal: AbortSignal): Promise<Result> {
  try {
    const response = await fetch("/api/player?tag=" + encodeURIComponent(tag), {
      signal, cache: "no-store", headers: { Accept: "application/json" },
    });
    if (!response.ok) return { state: "error", code: response.status };
    const player = await response.json() as PlayerData;
    if (!player || typeof player.name !== "string" || !Array.isArray(player.brawlers)) {
      return { state: "error", code: null };
    }
    return { state: "ready", player };
  } catch {
    return { state: "error", code: null };
  }
}

export default function PlayerComparison({ locale = "ko", initialA = "", initialB = "" }: {
  locale?: Locale; initialA?: string; initialB?: string;
}) {
  const copy = getComparisonMessages(locale);
  const [tagA, setTagA] = useState(initialA);
  const [tagB, setTagB] = useState(initialB);
  const [left, setLeft] = useState<Result>(idle);
  const [right, setRight] = useState<Result>(idle);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const request = useRef<AbortController | null>(null);
  const requestId = useRef(0);

  const search = useCallback((a: string, b: string) => {
    request.current?.abort();
    const id = ++requestId.current;
    const tags = validatedComparisonTags(a, b);
    setCopied(false);
    if (!tags) {
      setError(getComparisonMessages(locale).invalid);
      setLeft(idle);
      setRight(idle);
      if (typeof window !== "undefined") {
        window.history.replaceState(window.history.state, "", window.location.pathname);
      }
      return;
    }
    setError("");
    setTagA(tags.left);
    setTagB(tags.right);
    setLeft({ state: "loading" });
    setRight({ state: "loading" });
    const controller = new AbortController();
    request.current = controller;
    const leftRequest = fetchPlayer(tags.left, controller.signal);
    const rightRequest = fetchPlayer(tags.right, controller.signal);
    void leftRequest.then(result => {
      if (requestId.current === id && !controller.signal.aborted) setLeft(result);
    });
    void rightRequest.then(result => {
      if (requestId.current === id && !controller.signal.aborted) setRight(result);
    });
    void Promise.all([leftRequest, rightRequest]).then(([a, b]) => {
      if (requestId.current === id && !controller.signal.aborted && a.state === "ready" && b.state === "ready") sendUsageEvent("comparison_run");
    });
    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", comparisonPath(window.location.pathname, tags.left, tags.right));
    }
  }, [locale]);

  useEffect(() => {
    let disposed = false;
    const sequenceRef = requestId;
    const activeRequestRef = request;
    if (validatedComparisonTags(initialA, initialB)) {
      queueMicrotask(() => { if (!disposed) search(initialA, initialB); });
    }
    return () => {
      disposed = true;
      sequenceRef.current++;
      activeRequestRef.current?.abort();
    };
  }, [initialA, initialB, search]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search(tagA, tagB);
  }

  async function share() {
    if (left.state !== "ready" || right.state !== "ready") return;
    try {
      const path = comparisonPath(window.location.pathname, left.player.tag, right.player.tag);
      await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
      setCopied(true);
      sendUsageEvent("profile_share");
    } catch {
      setError(copy.copyFailed);
    }
  }

  const a = left.state === "ready" ? summarizeComparedPlayer(left.player) : null;
  const b = right.state === "ready" ? summarizeComparedPlayer(right.player) : null;
  const fmt = (n: number) => Number.isFinite(n) ? n.toLocaleString(numberLocales[locale]) : "—";
  const fields = a && b ? [
    [copy.trophy, a.trophies, b.trophies],
    [copy.peak, a.highestTrophies, b.highestTrophies],
    [copy.victory3, a.victories3v3, b.victories3v3],
    [copy.solo, a.soloVictories, b.soloVictories],
    [copy.duo, a.duoVictories, b.duoVictories],
    [copy.owned, a.brawlers, b.brawlers],
    [copy.max, a.power11, b.power11],
    [copy.power, a.upgradePercent, b.upgradePercent],
    [copy.coins, a.upgradesCoins, b.upgradesCoins],
    [copy.gadget, a.gadgets, b.gadgets],
    [copy.star, a.starPowers, b.starPowers],
    [copy.hyper, a.hyperCharges, b.hyperCharges],
  ] as const : [];
  const ranked = (name: string | undefined, elo: number | undefined) =>
    name ? (locale === "ko" ? rankDict[name] ?? name : name) + (typeof elo === "number" ? " · " + fmt(elo) : "") : copy.noRanked;
  const ranks = left.state === "ready" && right.state === "ready" ? [
    [copy.ranked, ranked(left.player.rankedRankName, left.player.rankedElo), ranked(right.player.rankedRankName, right.player.rankedElo)],
    [copy.rankedHighest, ranked(left.player.highestAllTimeRankedRankName, left.player.highestAllTimeRankedElo), ranked(right.player.highestAllTimeRankedRankName, right.player.highestAllTimeRankedElo)],
  ] : [];
  const busy = left.state === "loading" || right.state === "loading";
  return <div className="space-y-6">
    <form onSubmit={submit} className="rounded-2xl border border-amber-200 bg-[#fff5ce] p-4 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        {([[copy.first, tagA, setTagA], [copy.second, tagB, setTagB]] as const).map(([label, value, setter]) =>
          <label key={label} className="block min-w-0">
            <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
            <input aria-label={label} value={value} onChange={e => setter(e.target.value)}
              placeholder="#9C82J8YPP" maxLength={16} autoCapitalize="characters" autoComplete="off" spellCheck={false}
              className="min-h-12 w-full rounded-lg border border-[#d5cba4] bg-white px-3 text-base font-semibold focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </label>)}
        <button type="submit" disabled={busy}
          className="min-h-12 rounded-lg bg-blue-600 px-6 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60">
          {busy ? copy.busy : copy.action}
        </button>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{error}</p> : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-3xl text-xs leading-5 text-[#6e6240]">{copy.caveat}</p>
        {a && b ? <button type="button" onClick={() => void share()}
          className="min-h-11 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-800 hover:bg-blue-100">
          {copied ? copy.copied : copy.share}
        </button> : null}
      </div>
    </form>
    {left.state === "idle" && right.state === "idle" ?
      <p className="py-5 text-center text-sm text-slate-500">{copy.intro}</p> :
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <ProfileCard result={left} tag={tagA} label="A" locale={locale} error={copy.failed} stale={copy.freshnessStale}/>
        <ProfileCard result={right} tag={tagB} label="B" locale={locale} error={copy.failed} stale={copy.freshnessStale}/>
      </div>}
    {a && b ? <>
      <section aria-label={copy.stats} className="overflow-hidden border-y border-slate-200 bg-white py-5">
        <h2 className="text-xl font-extrabold">{copy.stats}</h2>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(70px,0.9fr)_minmax(70px,0.9fr)] gap-2 rounded-lg bg-slate-50 px-3 py-3 text-center text-xs font-bold sm:grid-cols-3 sm:px-5">
          <span aria-hidden="true" />
          <span className="text-blue-700">A</span>
          <span className="text-rose-700">B</span>
        </div>
        <div className="divide-y divide-slate-100">
          {fields.map(([label, leftVal, rightVal]) => {
            const win = label === copy.coins ? null : higherValueSide(leftVal, rightVal);
            const display = (value: number | null) =>
              value === null ? "—" : label === copy.power ? value.toFixed(1) + "%" : fmt(value);
            return <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(70px,0.9fr)_minmax(70px,0.9fr)] items-center gap-2 px-3 py-3 text-sm sm:grid-cols-3 sm:px-5">
              <span className="text-xs font-bold leading-5 text-slate-600 sm:text-sm">{label}</span>
              <strong className={"min-w-0 text-center tabular-nums " + (win === "a" ? "text-blue-700" : "text-slate-900")}>{display(leftVal)}</strong>
              <strong className={"min-w-0 text-center tabular-nums " + (win === "b" ? "text-rose-700" : "text-slate-900")}>{display(rightVal)}</strong>
            </div>;
          })}
          {ranks.map(([label, l, r]) => <div key={label}
            className="grid grid-cols-[minmax(0,1fr)_minmax(70px,0.9fr)_minmax(70px,0.9fr)] items-center gap-2 px-3 py-3 text-xs sm:grid-cols-3 sm:px-5 sm:text-sm">
            <span className="font-bold text-slate-600">{label}</span>
            <span className="min-w-0 break-words text-center font-bold">{l}</span>
            <span className="min-w-0 break-words text-center font-bold">{r}</span>
          </div>)}
        </div>
      </section>
      <section aria-label={copy.top} className="bg-white pb-4">
        <h2 className="text-xl font-extrabold">{copy.top}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-4">
          {[a, b].map((summary, index) => <ol key={index} className="min-w-0 space-y-2">
            {summary.topBrawlers.map((br, i) => <li key={br.id}
              className="flex min-w-0 items-center gap-2 border-b border-slate-100 px-1 py-3 text-xs">
              <span className="shrink-0 font-black text-slate-500">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate font-bold">{translateBrawlerName(br.name, locale)}</span>
              <span className="shrink-0 font-black text-blue-800">{fmt(br.trophies)}</span>
            </li>)}
          </ol>)}
        </div>
      </section>
    </> : null}
  </div>;
}

function ProfileCard({ result, tag, label, locale, error, stale }: {
  result: Result; tag: string; label: string; locale: Locale; error: string; stale: string;
}) {
  return <section aria-label={"Player " + label} className={`min-w-0 rounded-xl border-t-4 p-3 sm:p-5 ${label === "A" ? "border-blue-600 bg-blue-50" : "border-rose-500 bg-rose-50"}`}>
    <p className={`mb-3 text-xs font-bold ${label === "A" ? "text-blue-700" : "text-rose-700"}`}>PLAYER {label}</p>
    {result.state === "loading" ? <div role="status" className="h-20 animate-pulse rounded-lg bg-slate-100"/> : null}
    {result.state === "error" ? <p role="alert" className="text-sm font-bold text-rose-700">
      {error} {result.code ? "(" + result.code + ")" : ""}
    </p> : null}
    {result.state === "ready" ? <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      {result.player.icon?.id ? <BrawlImage src={getPlayerIconUrl(result.player.icon.id)}
        alt="" width={56} height={56} className="h-12 w-12 shrink-0 rounded-lg border object-cover"/> :
        <div aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 font-black">{label}</div>}
      <div className="min-w-0">
        <h3 className="truncate text-base font-black sm:text-lg">{result.player.name}</h3>
        <p className="truncate text-xs font-bold text-slate-500">{result.player.tag || "#" + tag}</p>
        <p className="mt-1 inline-flex items-center gap-1 text-sm font-black text-blue-800">
          <StatSymbol kind="trophy" size={16}/>
          {result.player.trophies.toLocaleString(numberLocales[locale])}
        </p>
        {result.player.dataFreshness?.status === "stale" ?
          <p className="text-xs font-bold text-amber-700">{stale}</p> : null}
      </div>
    </div> : null}
  </section>;
}
