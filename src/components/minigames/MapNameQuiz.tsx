"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BrawlImage from "../BrawlImage";
import { numberLocales, type Locale } from "../../i18n/config";
import { getMinigameMessages } from "../../i18n/minigameMessages";
import { buildMapQuestionDeck, MAP_QUESTION_COUNT, type MapQuizEntry, type MapQuizQuestion } from "../../utils/minigames/mapQuiz";
import { useRoundBest } from "./useRoundBest";
import RoundProgress from "./RoundProgress";
import QuizChoiceGrid from "./QuizChoiceGrid";
import RoundResults, { type RoundRecap } from "./RoundResults";

type Phase = "ready" | "playing" | "finished";

export default function MapNameQuiz({ locale, maps }: { locale: Locale; maps: MapQuizEntry[] }) {
  const copy = getMinigameMessages(locale);
  const gameCopy = copy.mapQuiz;
  const [phase, setPhase] = useState<Phase>("ready");
  const [sessionToken, setSessionToken] = useState(0);
  const [deck, setDeck] = useState<MapQuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [recap, setRecap] = useState<RoundRecap[]>([]);
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [answered, setAnswered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [incomplete, setIncomplete] = useState(false);
  const [poolError, setPoolError] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const sessionRef = useRef(0);
  const currentDeckRef = useRef<MapQuizQuestion[]>([]);
  const currentIndexRef = useRef(0);
  const currentQuestionRef = useRef<number | null>(null);
  const answeredRef = useRef(false);
  const handledImageFailuresRef = useRef(new Set<number>());
  const failedImageStreakRef = useRef(0);
  const { best, beginRound, record } = useRoundBest("map-quiz", "standard");
  const score = useMemo(() => recap.filter((item) => item.wasCorrect).length, [recap]);
  const uniqueCount = useMemo(() => new Set(maps.map((map) => map.displayName.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase(numberLocales[locale]))).size, [locale, maps]);
  const question = deck[index];
  const canPlay = uniqueCount >= MAP_QUESTION_COUNT;
  const failImage = useCallback((questionId: number, session: number) => {
    if (sessionRef.current !== session || currentQuestionRef.current !== questionId || answeredRef.current || handledImageFailuresRef.current.has(questionId)) return;
    handledImageFailuresRef.current.add(questionId);
    failedImageStreakRef.current += 1;
    setImageLoadFailed(true);
    const nextIndex = currentIndexRef.current + 1;
    if (failedImageStreakRef.current >= 5 || nextIndex >= currentDeckRef.current.length) {
      setIncomplete(true);
      setPhase("finished");
      return;
    }
    currentIndexRef.current = nextIndex;
    currentQuestionRef.current = currentDeckRef.current[nextIndex].id;
    setSelectedId(undefined);
    setAnswered(false);
    answeredRef.current = false;
    setImageLoaded(false);
    setIndex(nextIndex);
  }, [setAnswered, setImageLoadFailed, setImageLoaded, setIncomplete, setIndex, setPhase, setSelectedId]);

  useEffect(() => {
    if (phase === "playing" && answered) nextRef.current?.focus();
    if (phase === "playing" && !answered && !imageLoaded) promptRef.current?.focus();
    if (phase === "finished") record(score, recap.length);
  }, [answered, imageLoaded, phase, recap.length, record, score]);

  useEffect(() => {
    if (phase !== "playing" || !question || imageLoaded || answered) return;
    const session = sessionToken;
    const timeout = window.setTimeout(() => failImage(question.id, session), 8_000);
    return () => window.clearTimeout(timeout);
  }, [answered, failImage, imageLoaded, index, phase, question, sessionToken]);

  function startGame() {
    const nextDeck = buildMapQuestionDeck(maps, locale);
    if (nextDeck.length < MAP_QUESTION_COUNT) {
      setPoolError(true);
      return;
    }
    beginRound();
    setPoolError(false);
    sessionRef.current += 1;
    setSessionToken(sessionRef.current);
    failedImageStreakRef.current = 0;
    handledImageFailuresRef.current.clear();
    currentDeckRef.current = nextDeck;
    currentIndexRef.current = 0;
    setDeck(nextDeck);
    setIndex(0);
    setRecap([]);
    setSelectedId(undefined);
    setAnswered(false);
    answeredRef.current = false;
    setImageLoaded(false);
    setImageLoadFailed(false);
    setFeedback("");
    setIncomplete(false);
    currentQuestionRef.current = nextDeck[0]?.id ?? null;
    setPhase("playing");
  }

  function imageLoadedFor(questionId: number, session: number) {
    if (sessionRef.current !== session || currentQuestionRef.current !== questionId || handledImageFailuresRef.current.has(questionId)) return;
    failedImageStreakRef.current = 0;
    setImageLoaded(true);
    setImageLoadFailed(false);
    setFeedback("");
  }

  function choose(id: number) {
    if (phase !== "playing" || !question || !imageLoaded || answeredRef.current) return;
    const picked = question.choices.find((option) => option.id === id);
    if (!picked) return;
    const correct = id === question.id;
    answeredRef.current = true;
    setSelectedId(id);
    setAnswered(true);
    setRecap((items) => [...items, { prompt: gameCopy.prompt, answer: question.displayName, wasCorrect: correct }]);
    setFeedback(correct ? copy.round.correct : copy.round.incorrect);
  }

  function advance() {
    if (!answered) return;
    if (recap.length >= MAP_QUESTION_COUNT) {
      setPhase("finished");
      return;
    }
    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex >= currentDeckRef.current.length) {
      setIncomplete(true);
      setPhase("finished");
      return;
    }
    currentIndexRef.current = nextIndex;
    currentQuestionRef.current = currentDeckRef.current[nextIndex].id;
    answeredRef.current = false;
    setAnswered(false);
    setSelectedId(undefined);
    setImageLoaded(false);
    setImageLoadFailed(false);
    setFeedback("");
    setIndex(nextIndex);
  }

  function endSession() {
    setIncomplete(recap.length < MAP_QUESTION_COUNT);
    setPhase("finished");
  }

  function restart() {
    sessionRef.current += 1;
    setSessionToken(sessionRef.current);
    setPhase("ready");
    currentDeckRef.current = [];
    currentIndexRef.current = 0;
    setDeck([]);
    setIndex(0);
    setRecap([]);
    setSelectedId(undefined);
    setAnswered(false);
    answeredRef.current = false;
    setImageLoaded(false);
    setImageLoadFailed(false);
    setFeedback("");
    setIncomplete(false);
  }

  const bestText = best ? copy.round.best.replace("{score}", String(best.score)).replace("{percentage}", String(best.percentage)) : copy.round.noBest;
  return (
    <section className="space-y-4" aria-label={gameCopy.title}>
      {phase === "ready" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium leading-6 text-slate-600">{gameCopy.rules}</p>
          <p className="mt-3 text-sm font-black text-blue-700">{gameCopy.pool.replace("{count}", uniqueCount.toLocaleString(numberLocales[locale]))}</p>
          <p className="mt-3 text-xs font-bold text-slate-500">{copy.round.tenQuestions}</p>
          <p className="mt-4 text-sm font-bold text-slate-600">{bestText}</p>
          {!canPlay || poolError ? <p role="status" className="mt-3 text-sm font-bold text-amber-800">{maps.length ? gameCopy.noMaps : copy.round.dataUnavailable}</p> : null}
          <button type="button" disabled={!canPlay || poolError} onClick={startGame} className="mt-5 min-h-11 rounded-lg bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300">{copy.round.start}</button>
        </div>
      ) : null}

      {phase === "playing" && question ? (
        <div className="space-y-4">
          <RoundProgress current={recap.length + 1} completed={recap.length} score={score} copy={copy.round} />
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="map-question-title">
            <h2 ref={promptRef} id="map-question-title" tabIndex={-1} className="text-lg font-black text-slate-950 focus:outline-none">{gameCopy.prompt}</h2>
            <div className="relative mt-4 flex min-h-56 items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:min-h-72">
              <BrawlImage key={question.id + ":" + sessionToken} src={question.imageUrl} alt={gameCopy.imageAlt} fallbackText="?" width={800} height={420} sizes="(max-width: 639px) 100vw, 800px" className="h-56 w-full object-contain sm:h-72" onLoad={() => imageLoadedFor(question.id, sessionToken)} onError={() => failImage(question.id, sessionToken)} />
              {!imageLoaded ? <span role="status" aria-live="polite" className="sr-only">{copy.round.loading}</span> : null}
            </div>
            <h3 className="mb-3 mt-5 text-sm font-black text-slate-700">{copy.round.question} {recap.length + 1} / 10</h3>
            <QuizChoiceGrid choices={question.choices} disabled={!imageLoaded || answered} selectedId={selectedId} correctId={answered ? question.id : undefined} onChoose={choose} correctLabel={copy.round.correct} selectedLabel={copy.round.incorrect} groupLabel={gameCopy.prompt} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p role="status" aria-live="polite" className="min-h-6 text-sm font-bold text-slate-700">{imageLoadFailed ? copy.round.imageFailed : feedback}</p>
              <button type="button" onClick={endSession} className="min-h-11 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 underline-offset-2 hover:text-slate-950 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{copy.round.endSession}</button>
            </div>
            {answered ? <button ref={nextRef} type="button" onClick={advance} className="mt-2 min-h-11 rounded-lg bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{recap.length >= MAP_QUESTION_COUNT ? copy.round.results : copy.round.next}</button> : null}
          </section>
        </div>
      ) : null}

      {phase === "finished" ? <RoundResults locale={locale} copy={copy.round} score={score} completed={recap.length} best={best} recap={recap} onRestart={restart} earlyEnd={incomplete || recap.length < MAP_QUESTION_COUNT} /> : null}
    </section>
  );
}
