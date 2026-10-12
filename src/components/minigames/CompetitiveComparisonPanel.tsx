"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import BrawlImage from "../BrawlImage";
import { useAccount } from "../../hooks/useAccount";
import { localizedHref, type Locale } from "../../i18n/config";
import { getCompetitiveMessages } from "../../i18n/minigames/competitiveMessages";
import type { PublicQuestion, CompetitiveGame, RankingPeriod } from "../../server/competitiveComparison";

type Ranking = { rank: number; alias: string; score: number; total: number };
type Answer = {
  correct: boolean; correctId: number; firstValue: number; secondValue: number;
  score: number; finished: boolean; nextQuestion: PublicQuestion | null;
};
type ActiveRound = { roundId: string; question: PublicQuestion };
const periods = ["today", "week", "all"] as const;

export default function CompetitiveComparisonPanel({ locale, gameId }: { locale: Locale; gameId: CompetitiveGame }) {
  const copy = getCompetitiveMessages(locale);
  const account = useAccount();
  const [period, setPeriod] = useState<RankingPeriod>("today");
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [rankStatus, setRankStatus] = useState<"loading" | "ready" | "error">("loading");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [round, setRound] = useState<ActiveRound | null>(null);
  const [feedback, setFeedback] = useState<Answer | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const userId = account.status === "account" && account.account?.onboardingComplete ? account.account.id : null;
  const canCompete = Boolean(userId && account.syncEnabled);

  const refreshRankings = useCallback(async (signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams({ game: gameId, period });
      const response = await fetch("/api/minigames/competitive/leaderboard?" + params, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("UNAVAILABLE");
      const body = await response.json() as { items: Ranking[] };
      if (!signal?.aborted) { setRankings(body.items); setRankStatus("ready"); }
    } catch {
      if (!signal?.aborted) setRankStatus("error");
    }
  }, [gameId, period]);
  useEffect(() => {
    const abort = new AbortController();
    const handle = window.setTimeout(() => void refreshRankings(abort.signal), 0);
    return () => { abort.abort(); window.clearTimeout(handle); };
  }, [refreshRankings]);

  async function post(path: "start" | "answer" | "withdraw", body: Record<string, unknown>) {
    if (!userId) throw new Error("LOGIN_REQUIRED");
    const response = await fetch("/api/minigames/competitive/" + path, {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedUserId: userId, ...body }),
    });
    if (!response.ok) {
      if ([404, 409, 410].includes(response.status)) throw new Error("EXPIRED");
      throw new Error("UNAVAILABLE");
    }
    return response.json() as Promise<unknown>;
  }

  async function start() {
    if (!consent || !userId || busy) return;
    setBusy(true); setError("");
    try {
      const started = await post("start", { gameId, publicAliasConsent: true }) as ActiveRound;
      setRound(started); setFeedback(null); setSelected(null); setResult(null);
    } catch { setError(copy.error); }
    finally { setBusy(false); }
  }
  async function choose(pickedId: number) {
    if (!round || feedback || busy) return;
    setBusy(true); setError("");
    try {
      const answer = await post("answer", { roundId: round.roundId, index: round.question.index, pickedId }) as Answer;
      setSelected(pickedId); setFeedback(answer);
    } catch (cause) {
      const expired = cause instanceof Error && cause.message === "EXPIRED";
      setError(expired ? copy.expired : copy.error);
      if (expired) setRound(null);
    } finally { setBusy(false); }
  }
  function advance() {
    if (!feedback || !round) return;
    if (feedback.finished) {
      setResult(feedback.score); setRound(null); setFeedback(null);
      void refreshRankings();
    } else if (feedback.nextQuestion) {
      setRound({ ...round, question: feedback.nextQuestion });
      setFeedback(null); setSelected(null);
    }
  }
  async function withdraw() {
    if (!userId || busy) return;
    setBusy(true); setError("");
    try {
      await post("withdraw", { confirmWithdraw: true });
      setConfirmRemove(false); setConsent(false); setRound(null); setResult(null);
      await refreshRankings();
    } catch { setError(copy.error); }
    finally { setBusy(false); }
  }

  const renderChoice = (id: number, label: string, imageUrl: string, value?: number) => (
    <button type="button" key={id} onClick={() => void choose(id)}
      disabled={busy || Boolean(feedback)} aria-pressed={selected === id}
      className={`flex min-h-36 flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 text-center focus-visible:outline-2 focus-visible:outline-blue-700 ${feedback && feedback.correctId === id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-blue-500"}`}>
      {imageUrl ? <BrawlImage src={imageUrl} width={80} height={80} sizes="80px" alt="" fallbackText={label.slice(0, 1)} className="h-20 w-20 object-contain" /> : <span aria-hidden className="text-3xl">🎮</span>}
      <strong className="break-words">{label}</strong>
      <span className="text-xs">{value === undefined ? "?" : gameId === "higher-lower" ? value.toLocaleString(locale) + " HP" : new Date(value * 86_400_000).toISOString().slice(0, 10)}</span>
    </button>
  );

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-label={copy.title}>
      <div>
        <h2 className="text-xl font-black text-slate-900">{copy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{copy.intro}</p>
      </div>
      {result !== null ? <div role="status" className="rounded-lg bg-emerald-50 p-4 font-black text-emerald-900">{copy.played}: {result}/10</div> : null}
      {round ? (
        <div className="space-y-3">
          <h3 className="font-black" aria-live="polite">{round.question.index + 1}/10 · {copy.score}: {feedback?.score ?? "—"}</h3>
          <div role="group" aria-label={copy.title} className="grid grid-cols-2 gap-3">
            {renderChoice(round.question.first.id, round.question.first.displayName, round.question.first.imageUrl, feedback?.firstValue)}
            {renderChoice(round.question.second.id, round.question.second.displayName, round.question.second.imageUrl, feedback?.secondValue)}
          </div>
          {feedback ? <div role="status" className="flex flex-wrap items-center gap-3">
            <strong>{feedback.correct ? copy.correct : copy.incorrect}</strong>
            <button type="button" onClick={advance} className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 font-bold text-white">{feedback.finished ? copy.finish : copy.next}</button>
          </div> : null}
        </div>
      ) : (
        <div className="space-y-3">
          {canCompete ? <>
            <label className="flex items-start gap-3 text-sm leading-6">
              <input type="checkbox" className="mt-1.5" checked={consent} onChange={event => setConsent(event.target.checked)} />
              {copy.consent}
            </label>
            <button type="button" disabled={!consent || busy} onClick={() => void start()} className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? copy.loading : copy.start}</button>
          </> : <p className="text-sm text-slate-600">{copy.signIn}{" "}
            <Link className="font-bold text-blue-700 underline" href={localizedHref(locale, "/account")}>{copy.noAccount}</Link>
          </p>}
        </div>
      )}
      {error ? <p role="alert" className="text-sm font-bold text-rose-700">{error}</p> : null}
      <div className="border-t border-slate-200 pt-4">
        <h3 className="font-black text-slate-900">{copy.ranking}</h3>
        <div role="group" aria-label={copy.ranking} className="mt-3 flex flex-wrap gap-2">
          {periods.map(item => <button key={item} type="button" aria-pressed={period === item} onClick={() => { setPeriod(item); setRankStatus("loading"); }}
            className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-bold ${period === item ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200"}`}>{copy[item]}</button>)}
        </div>
        {rankStatus === "error" ? <p className="mt-3 text-sm" role="status">{copy.offline}</p>
          : rankStatus === "ready" && rankings.length === 0 ? <p className="mt-3 text-sm text-slate-600">{copy.empty}</p>
          : rankStatus === "ready" ? <ol className="mt-3 divide-y divide-slate-200">
            {rankings.map(item => <li key={item.alias} className="flex items-center gap-3 py-3 text-sm">
              <strong className="w-9 shrink-0">{item.rank}.</strong>
              <span className="min-w-0 flex-1 break-all">{item.alias}</span>
              <strong>{item.score}/{item.total}</strong>
            </li>)}
          </ol> : <p className="mt-3 text-sm">{copy.loading}</p>}
      </div>
      <p className="text-xs leading-6 text-slate-600">{copy.privacy}</p>
      {userId ? <div className="border-t border-slate-200 pt-3">
        {confirmRemove ? <div className="space-y-2"><p className="text-sm font-bold text-rose-800">{copy.confirm}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="min-h-11 rounded-lg bg-rose-700 px-3 py-2 font-bold text-white" disabled={busy} onClick={() => void withdraw()}>{copy.delete}</button>
            <button type="button" className="min-h-11 rounded-lg border px-3 py-2" onClick={() => setConfirmRemove(false)}>{copy.cancel}</button>
          </div>
        </div> : <button type="button" className="min-h-11 text-sm font-bold text-rose-700 underline" onClick={() => setConfirmRemove(true)}>{copy.withdraw}</button>}
      </div> : null}
    </section>
  );
}
