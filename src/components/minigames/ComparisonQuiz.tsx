"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BrawlImage from "../BrawlImage";
import type { Locale } from "../../i18n/config";
import { numberLocales } from "../../i18n/config";
import { getMinigameMessages } from "../../i18n/minigameMessages";
import { getBlockedCopy } from "../../i18n/minigames/blockedGameMessages";
import { getComparisonMessages } from "../../i18n/minigames/comparisonMessages";
import { buildComparisonDeck, COMPARISON_QUESTION_COUNT, type ComparisonEntry, type ComparisonQuestion } from "../../utils/minigames/comparisonQuiz";
import { useRoundBest } from "./useRoundBest";
import RoundProgress from "./RoundProgress";
import RoundResults, { type RoundRecap } from "./RoundResults";

type Kind = "higher-lower" | "release-order";
type Phase = "ready" | "playing" | "finished";

export default function ComparisonQuiz({ kind, locale, entries }: { kind: Kind; locale: Locale; entries: ComparisonEntry[] }) {
  const round = getMinigameMessages(locale).round;
  const labels = getComparisonMessages(locale);
  const copy = getBlockedCopy(locale, kind);
  const [phase, setPhase] = useState<Phase>("ready");
  const [deck, setDeck] = useState<ComparisonQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [recap, setRecap] = useState<RoundRecap[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [earlyEnd, setEarlyEnd] = useState(false);
  const [poolError, setPoolError] = useState(false);
  const answeredRef = useRef(false);
  const recordedRef = useRef(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const { best, beginRound, record } = useRoundBest(kind, "standard");
  const prefer = kind === "higher-lower" ? "higher" : "earlier";
  const question = deck[index];
  const score = useMemo(() => recap.filter(item => item.wasCorrect).length, [recap]);
  const count = entries.length.toLocaleString(numberLocales[locale]);

  useEffect(() => {
    if (phase === "playing" && selected !== null) nextRef.current?.focus();
    else if (phase === "playing") questionRef.current?.focus();
  }, [phase, selected, index]);
  useEffect(() => {
    if (phase !== "finished" || recordedRef.current || recap.length !== COMPARISON_QUESTION_COUNT) return;
    recordedRef.current = true;
    record(score, recap.length);
  }, [phase, recap.length, record, score]);

  function start() {
    const questions = buildComparisonDeck(entries, prefer);
    if (questions.length !== COMPARISON_QUESTION_COUNT) { setPoolError(true); return; }
    recordedRef.current = false;
    beginRound();
    answeredRef.current = false;
    setPoolError(false);
    setDeck(questions);
    setIndex(0);
    setRecap([]);
    setSelected(null);
    setEarlyEnd(false);
    setPhase("playing");
  }
  function format(value: number): string {
    return kind === "higher-lower" ? value.toLocaleString(numberLocales[locale])
      : new Date(value * 86_400_000).toISOString().slice(0, 10);
  }
  function choose(id: number) {
    if (phase !== "playing" || selected !== null || answeredRef.current || !question ||
      (id !== question.first.id && id !== question.second.id)) return;
    answeredRef.current = true;
    setSelected(id);
    const correct = id === question.correctId;
    const answer = question.correctId === question.first.id ? question.first : question.second;
    setRecap(items => [...items, {
      prompt: kind === "higher-lower" ? labels.higher : labels.earlier,
      answer: answer.displayName + " (" + format(answer.value) + ")",
      wasCorrect: correct,
    }]);
  }
  function advance() {
    if (selected === null) return;
    if (recap.length === COMPARISON_QUESTION_COUNT) { setPhase("finished"); return; }
    answeredRef.current = false;
    setSelected(null);
    setIndex(value => value + 1);
  }
  function finish() {
    setEarlyEnd(recap.length < COMPARISON_QUESTION_COUNT);
    setPhase("finished");
  }
  const bestText = best ? round.best.replace("{score}", String(best.score)).replace("{percentage}", String(best.percentage)) : round.noBest;
  return (
    <section className="space-y-4" aria-label={copy.title}>
      {phase === "ready" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm leading-7 text-slate-700">{kind === "higher-lower" ? labels.higherRules : labels.releaseRules}</p>
          <p className="mt-3 text-sm font-bold text-blue-700">{labels.pool.replace("{count}", count)}</p>
          <p className="mt-2 text-xs text-slate-600">{kind === "higher-lower" ? labels.hpSource : labels.releaseSource}</p>
          <p className="mt-2 text-sm font-bold text-slate-800">{round.tenQuestions} · {bestText}</p>
          <p className="mt-2 text-xs text-slate-500">{labels.localBest}</p>
          {entries.length < COMPARISON_QUESTION_COUNT * 2 || poolError ?
            <p role="status" className="mt-3 text-sm font-bold text-amber-800">{round.insufficient}</p> : null}
          <button type="button" onClick={start} disabled={entries.length < COMPARISON_QUESTION_COUNT * 2 || poolError} className="mt-5 min-h-11 rounded-lg bg-blue-600 px-6 py-2 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{round.start}</button>
        </div>
      ) : null}
      {phase === "playing" && question ? (
        <div className="space-y-4">
          <RoundProgress current={recap.length + (selected === null ? 1 : 0)} completed={recap.length} score={score} copy={round} />
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 ref={questionRef} tabIndex={-1} className="text-lg font-black text-slate-900 focus:outline-none">
              {kind === "higher-lower" ? labels.higher : labels.earlier}
            </h2>
            <div role="group" aria-label={copy.title} className="mt-5 grid grid-cols-2 gap-3">
              {[question.first, question.second].map(item => (
                <button key={item.id} type="button" disabled={selected !== null} onClick={() => choose(item.id)}
                  aria-pressed={selected === item.id}
                  className={`flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border-2 px-3 py-5 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${selected !== null && item.id === question.correctId ? "border-emerald-500 bg-emerald-50" : selected === item.id ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-slate-50 hover:border-blue-500 hover:bg-blue-50"}`}>
                  {item.imageUrl ? <BrawlImage src={item.imageUrl} width={94} height={94} sizes="94px" alt="" fallbackText={item.displayName.slice(0, 1)} className="h-20 w-20 rounded-lg object-contain sm:h-24 sm:w-24" /> :
                    <span aria-hidden className="flex h-20 w-20 items-center justify-center rounded-lg bg-blue-100 text-3xl font-black text-blue-800">{item.displayName.slice(0, 1)}</span>}
                  <strong className="break-words text-base text-slate-900">{item.displayName}</strong>
                  {selected !== null ? <span className="text-sm font-black text-blue-800">{format(item.value)}{kind === "higher-lower" ? " HP" : ""}</span> : <span className="text-sm font-bold text-slate-500">?</span>}
                </button>
              ))}
            </div>
            <p role="status" aria-live="polite" className="mt-4 min-h-6 text-sm font-bold text-slate-700">
              {selected === null ? "" : selected === question.correctId ? round.correct : round.incorrect}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {selected !== null ? <button ref={nextRef} type="button" onClick={advance} className="min-h-11 rounded-lg bg-blue-600 px-5 py-2 font-bold text-white">{recap.length === COMPARISON_QUESTION_COUNT ? round.results : round.next}</button> : null}
              <button type="button" onClick={finish} className="min-h-11 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 underline hover:text-slate-900">{round.endSession}</button>
            </div>
          </div>
        </div>
      ) : null}
      {phase === "finished" ? <RoundResults locale={locale} copy={round} score={score} completed={recap.length} best={best} recap={recap} earlyEnd={earlyEnd}
        onRestart={() => { setDeck([]); setIndex(0); setRecap([]); setSelected(null); setPhase("ready"); }} /> : null}
    </section>
  );
}
