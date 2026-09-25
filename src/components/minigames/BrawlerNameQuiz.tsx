"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import BrawlImage from "../BrawlImage";
import { localizedHref, numberLocales, type Locale } from "../../i18n/config";
import { getMinigameMessages } from "../../i18n/minigameMessages";
import { usePersonalBest } from "../../hooks/useAccount";
import {
  bestStorageKey,
  buildBrawlerAnswerLookup,
  calculateQuizScore,
  evaluateBrawlerAnswer,
  isBetterBest,
  isQuizComplete,
  quizModeSeconds,
  readQuizBests,
  type QuizBest,
  type QuizBrawler,
  type QuizMode,
} from "../../utils/minigames/brawlerQuiz";

type GamePhase = "ready" | "playing" | "finished";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function BrawlerChip({ brawler }: { brawler: QuizBrawler }) {
  return (
    <li className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
      {brawler.imageUrl ? (
        <BrawlImage src={brawler.imageUrl} alt="" fallbackText={brawler.displayName.slice(0, 1)} width={36} height={36} className="h-9 w-9 shrink-0 rounded-md object-cover" sizes="36px" />
      ) : (
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-sm font-black text-blue-700">
          {brawler.displayName.slice(0, 1)}
        </span>
      )}
      <span className="min-w-0 truncate text-sm font-bold text-slate-800">{brawler.displayName}</span>
    </li>
  );
}

export default function BrawlerNameQuiz({ locale, brawlers }: { locale: Locale; brawlers: QuizBrawler[] }) {
  const copy = getMinigameMessages(locale);
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [mode, setMode] = useState<QuizMode>("5m");
  const [input, setInput] = useState("");
  const [foundIds, setFoundIds] = useState<number[]>([]);
  const [remaining, setRemaining] = useState<number | null>(quizModeSeconds["5m"]);
  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [bests, setBests] = useState<Partial<Record<QuizMode, QuizBest>>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAtRef = useRef(0);
  const deadlineRef = useRef<number | null>(null);
  const { beginRound, recordPersonalBest } = usePersonalBest();

  const lookup = useMemo(() => buildBrawlerAnswerLookup(brawlers, locale), [brawlers, locale]);
  const foundSet = useMemo(() => new Set(foundIds), [foundIds]);
  const found = useMemo(() => brawlers.filter((brawler) => foundSet.has(brawler.id)), [brawlers, foundSet]);
  const missed = useMemo(() => brawlers.filter((brawler) => !foundSet.has(brawler.id)), [brawlers, foundSet]);
  const percent = calculateQuizScore(foundIds.length, brawlers.length);
  const numberFormatter = useMemo(() => new Intl.NumberFormat(numberLocales[locale]), [locale]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        setBests(readQuizBests(window.localStorage.getItem(bestStorageKey)));
      } catch {
        // Private browsing can deny localStorage; gameplay still works.
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    inputRef.current?.focus();
    const interval = window.setInterval(() => {
      const now = Date.now();
      setElapsed(Math.floor((now - startedAtRef.current) / 1000));
      if (deadlineRef.current !== null) {
        const secondsLeft = Math.max(0, Math.ceil((deadlineRef.current - now) / 1000));
        setRemaining(secondsLeft);
        if (secondsLeft === 0) setPhase("finished");
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "finished" || brawlers.length === 0) return;
    const candidate: QuizBest = {
      found: foundIds.length,
      total: brawlers.length,
      percentage: percent,
      mode,
      recordedAt: new Date().toISOString(),
    };
    // The guest localStorage PB is global to this browser, while a cloud PB is
    // account-scoped. Send every finished run and let the server compare it.
    void recordPersonalBest(
      "brawler-quiz",
      mode,
      candidate.found,
      candidate.total,
      candidate.recordedAt,
    );
    if (!isBetterBest(candidate, bests[mode])) return;
    const updated = { ...bests, [mode]: candidate };
    try {
      window.localStorage.setItem(bestStorageKey, JSON.stringify(updated));
    } catch {
      // Saving a personal best is optional when storage is unavailable.
    }
    const timeout = window.setTimeout(() => {
      setBests(updated);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [phase, foundIds.length, brawlers.length, percent, mode, bests, recordPersonalBest]);

  function startGame() {
    if (brawlers.length === 0) return;
    beginRound();
    const now = Date.now();
    startedAtRef.current = now;
    deadlineRef.current = quizModeSeconds[mode] === null ? null : now + quizModeSeconds[mode]! * 1000;
    setFoundIds([]);
    setInput("");
    setFeedback("");
    setElapsed(0);
    setRemaining(quizModeSeconds[mode]);
    setPhase("playing");
  }

  function finishGame(now: number) {
    setElapsed(Math.floor((now - startedAtRef.current) / 1000));
    setFeedback("");
    setPhase("finished");
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase !== "playing" || !input.trim()) return;
    const result = evaluateBrawlerAnswer(input, locale, lookup, foundSet);
    if (result.status === "incorrect") {
      setFeedback(copy.incorrect);
      inputRef.current?.select();
      return;
    }
    setInput("");
    if (result.status === "duplicate") {
      setFeedback(copy.duplicate);
      inputRef.current?.focus();
      return;
    }
    const id = result.id!;
    const answer = brawlers.find((brawler) => brawler.id === id)!;
    const nextFound = [...foundIds, id];
    setFoundIds(nextFound);
    setFeedback(copy.success.replace("{name}", answer.displayName));
    inputRef.current?.focus();
    if (isQuizComplete(nextFound.length, brawlers.length)) setPhase("finished");
  }

  async function shareResult() {
    const summary = `${copy.quizTitle}: ${foundIds.length}/${brawlers.length} (${percent}%) | Brawl Status KR`;
    try {
      if (navigator.share) {
        await navigator.share({ text: summary });
      } else {
        await navigator.clipboard.writeText(summary);
        setFeedback(copy.copied);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback(copy.shareFailed);
    }
  }

  const best = bests[mode];
  const modeLabels: Record<QuizMode, string> = {
    "3m": copy.threeMinutes,
    "5m": copy.fiveMinutes,
    "10m": copy.tenMinutes,
    practice: copy.practice,
  };

  return (
    <section className="space-y-4" aria-label={copy.quizTitle}>
      {brawlers.length === 0 ? (
        <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-700 shadow-sm">
          {copy.dataUnavailable}
        </p>
      ) : null}

      {phase === "ready" && brawlers.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-lg font-black text-slate-950">{copy.totalBrawlers.replace("{count}", numberFormatter.format(brawlers.length))}</p>
          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-black text-slate-700">{copy.timeLimit}</legend>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {(Object.keys(quizModeSeconds) as QuizMode[]).map((option) => (
                <label key={option} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-4 py-2 text-sm font-bold focus-within:ring-2 focus-within:ring-blue-500 ${mode === option ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-700"}`}>
                  <input type="radio" name="quiz-mode" value={option} checked={mode === option} onChange={() => setMode(option)} className="mr-2 accent-blue-600" />
                  {modeLabels[option]}
                </label>
              ))}
            </div>
          </fieldset>
          {best ? <p className="mt-4 text-sm font-bold text-slate-600">{copy.best.replace("{found}", String(best.found)).replace("{total}", String(best.total)).replace("{percent}", String(best.percentage))}</p> : null}
          <button type="button" onClick={startGame} className="mt-5 min-h-11 rounded-lg bg-blue-600 px-6 py-2 text-sm font-black text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            {copy.startGame}
          </button>
        </div>
      ) : null}

      {phase === "playing" ? (
        <div className="sticky top-0 z-20 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur sm:static sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-500">{remaining === null ? copy.elapsedTime : copy.remainingTime}</p>
              <p className="text-2xl font-black tabular-nums text-slate-950" aria-label={`${remaining === null ? copy.elapsedTime : copy.remainingTime}: ${formatTime(remaining ?? elapsed)}`}>
                {formatTime(remaining ?? elapsed)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-500">{copy.foundCount}</p>
              <p className="text-2xl font-black tabular-nums text-blue-700">{foundIds.length} / {brawlers.length}</p>
            </div>
          </div>
          <div role="progressbar" aria-label={copy.foundCount} aria-valuenow={foundIds.length} aria-valuemin={0} aria-valuemax={brawlers.length} className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600 transition-[width] motion-reduce:transition-none" style={{ width: `${percent}%` }} />
          </div>
          <form onSubmit={submitAnswer} className="mt-4 flex flex-wrap gap-2">
            <label className="min-w-48 flex-1">
              <span className="sr-only">{copy.answerLabel}</span>
              <input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} aria-label={copy.answerLabel} placeholder={copy.answerPlaceholder} autoComplete="off" spellCheck={false} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            </label>
            <button type="submit" className="min-h-11 rounded-lg bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{copy.submit}</button>
          </form>
          <div className="mt-2 flex min-h-7 flex-wrap items-center justify-between gap-2">
            <p role="status" aria-live="polite" className="text-sm font-bold text-slate-700">{feedback}</p>
            <button type="button" onClick={() => finishGame(Date.now())} className="rounded-md px-2 py-1 text-sm font-bold text-slate-600 underline-offset-2 hover:text-slate-950 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{copy.finish}</button>
          </div>
        </div>
      ) : null}

      {phase === "finished" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black text-slate-950">{copy.resultTitle}</h2>
          <p className="mt-2 text-3xl font-black text-blue-700">{foundIds.length} / {brawlers.length} <span className="text-xl text-slate-600">({percent}%)</span></p>
          <p className="mt-1 text-sm font-bold text-slate-600">{copy.timeUsed.replace("{time}", formatTime(elapsed))} · {modeLabels[mode]}</p>
          {best ? <p className="mt-2 text-sm font-bold text-slate-600">{copy.best.replace("{found}", String(best.found)).replace("{total}", String(best.total)).replace("{percent}", String(best.percentage))}</p> : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => { setPhase("ready"); setFeedback(""); }} className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{copy.restart}</button>
            <Link href={localizedHref(locale, "/minigames")} className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{copy.backToHub}</Link>
            <button type="button" onClick={() => void shareResult()} className="min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{copy.share}</button>
          </div>
          <p role="status" aria-live="polite" className="mt-2 text-sm font-bold text-slate-600">{feedback}</p>
        </div>
      ) : null}

      {phase !== "ready" ? (
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5" aria-label={copy.foundBrawlers}>
            <h2 className="mb-3 text-base font-black text-slate-900">{copy.foundBrawlers} ({found.length})</h2>
            {found.length ? <ul aria-label={copy.foundBrawlers} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{found.map((brawler) => <BrawlerChip key={brawler.id} brawler={brawler} />)}</ul> : <p className="text-sm text-slate-500">{copy.noneFound}</p>}
          </section>
          {phase === "finished" ? (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5" aria-label={copy.missedBrawlers}>
              <h2 className="mb-3 text-base font-black text-slate-900">{copy.missedBrawlers} ({missed.length})</h2>
              {missed.length ? <ul aria-label={copy.missedBrawlers} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{missed.map((brawler) => <BrawlerChip key={brawler.id} brawler={brawler} />)}</ul> : <p className="text-sm text-slate-500">{copy.noneMissed}</p>}
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
