"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import BrawlImage from "../BrawlImage";
import { numberLocales, type Locale } from "../../i18n/config";
import { getMinigameMessages } from "../../i18n/minigameMessages";
import { buildSilhouetteDeck, matchesSilhouetteAnswer, SILHOUETTE_QUESTION_COUNT, type SilhouetteEntry } from "../../utils/minigames/silhouetteQuiz";
import { useRoundBest } from "./useRoundBest";
import RoundProgress from "./RoundProgress";
import RoundResults, { type RoundRecap } from "./RoundResults";

type Phase = "ready" | "playing" | "finished";
type Mode = "base" | "skins" | "expert";

export default function SilhouetteQuiz({ locale, entries }: { locale: Locale; entries: SilhouetteEntry[] }) {
  const copy = getMinigameMessages(locale);
  const gameCopy = copy.silhouette;
  const [phase, setPhase] = useState<Phase>("ready");
  const [sessionToken, setSessionToken] = useState(0);
  const [mode, setMode] = useState<Mode>("base");
  const [deck, setDeck] = useState<SilhouetteEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [recap, setRecap] = useState<RoundRecap[]>([]);
  const [answer, setAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [incomplete, setIncomplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const sessionRef = useRef(0);
  const currentDeckRef = useRef<SilhouetteEntry[]>([]);
  const currentIndexRef = useRef(0);
  const currentQuestionRef = useRef<number | null>(null);
  const answeredRef = useRef(false);
  const handledImageFailuresRef = useRef(new Set<number>());
  const failedImageStreakRef = useRef(0);
  const { best, record } = useRoundBest("silhouette", "base");
  const score = useMemo(() => recap.filter((item) => item.wasCorrect).length, [recap]);
  const poolText = gameCopy.pool.replace("{count}", entries.length.toLocaleString(numberLocales[locale]));
  const question = deck[index];
  const canPlay = entries.length >= SILHOUETTE_QUESTION_COUNT;
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
    setImageLoaded(false);
    setAnswer("");
    setAnswered(false);
    answeredRef.current = false;
    setIndex(nextIndex);
  }, [setAnswer, setAnswered, setImageLoadFailed, setImageLoaded, setIncomplete, setIndex, setPhase]);

  useEffect(() => {
    if (phase === "playing" && answered) nextRef.current?.focus();
    if (phase === "playing" && imageLoaded && !answered) inputRef.current?.focus();
    if (phase === "playing" && !imageLoaded) promptRef.current?.focus();
    if (phase === "finished") record(score, recap.length);
  }, [answered, imageLoaded, phase, recap.length, record, score]);

  useEffect(() => {
    if (phase !== "playing" || !question || imageLoaded || answered) return;
    const session = sessionToken;
    const questionId = question.id;
    const timeout = window.setTimeout(() => failImage(questionId, session), 8_000);
    return () => window.clearTimeout(timeout);
  }, [answered, failImage, imageLoaded, index, phase, question, sessionToken]);

  function startGame() {
    if (mode !== "base" || !canPlay) return;
    sessionRef.current += 1;
    setSessionToken(sessionRef.current);
    failedImageStreakRef.current = 0;
    handledImageFailuresRef.current.clear();
    const nextDeck = buildSilhouetteDeck(entries);
    currentDeckRef.current = nextDeck;
    currentIndexRef.current = 0;
    setDeck(nextDeck);
    setIndex(0);
    setRecap([]);
    setAnswer("");
    setAnswered(false);
    answeredRef.current = false;
    setImageLoaded(false);
    setImageLoadFailed(false);
    setFeedback("");
    setIncomplete(false);
    currentQuestionRef.current = nextDeck[0]?.id ?? null;
    setPhase("playing");
  }

  function onImageLoad(questionId: number, session: number) {
    if (sessionRef.current !== session || currentQuestionRef.current !== questionId || handledImageFailuresRef.current.has(questionId)) return;
    failedImageStreakRef.current = 0;
    setImageLoaded(true);
    setImageLoadFailed(false);
    setFeedback("");
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase !== "playing" || !question || !imageLoaded || answered || !answer.trim()) return;
    const isCorrect = matchesSilhouetteAnswer(question, answer, locale);
    const response = isCorrect ? copy.round.correct : gameCopy.wrongAnswer + " " + question.displayName;
    const nextRecap = [...recap, { prompt: gameCopy.prompt, answer: question.displayName, wasCorrect: isCorrect }];
    answeredRef.current = true;
    setAnswered(true);
    setRecap(nextRecap);
    setFeedback(response);
    setAnswer("");
  }

  function skipQuestion() {
    if (phase !== "playing" || !question || !imageLoaded || answered) return;
    answeredRef.current = true;
    setAnswered(true);
    setRecap((current) => [...current, { prompt: gameCopy.prompt, answer: question.displayName, wasCorrect: false }]);
    setFeedback(gameCopy.skipped + " " + question.displayName);
  }

  function advance() {
    if (!answered) return;
    if (recap.length >= SILHOUETTE_QUESTION_COUNT) {
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
    setAnswer("");
    setImageLoaded(false);
    setImageLoadFailed(false);
    setFeedback("");
    setIndex(nextIndex);
  }

  function endSession() {
    if (phase !== "playing") return;
    setIncomplete(recap.length < SILHOUETTE_QUESTION_COUNT);
    setPhase("finished");
  }

  function restart() {
    sessionRef.current += 1;
    setSessionToken(sessionRef.current);
    setPhase("ready");
    setDeck([]);
    currentDeckRef.current = [];
    currentIndexRef.current = 0;
    setIndex(0);
    setRecap([]);
    setAnswer("");
    setAnswered(false);
    answeredRef.current = false;
    setImageLoaded(false);
    setImageLoadFailed(false);
    setFeedback("");
    setIncomplete(false);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault();
  }

  const bestText = best ? copy.round.best.replace("{score}", String(best.score)).replace("{percentage}", String(best.percentage)) : copy.round.noBest;

  return (
    <section className="space-y-4" aria-label={gameCopy.title}>
      {phase === "ready" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium leading-6 text-slate-600">{gameCopy.rules}</p>
          <p className="mt-3 text-sm font-black text-blue-700">{poolText}</p>
          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-black text-slate-700">{copy.round.chooseMode}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex min-h-11 cursor-pointer items-center rounded-lg border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800">
                <input type="radio" name="silhouette-mode" checked={mode === "base"} onChange={() => setMode("base")} className="mr-2 accent-blue-600" />{gameCopy.baseMode}
              </label>
              <label className="flex min-h-11 cursor-not-allowed items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-400">
                <input type="radio" name="silhouette-mode" disabled checked={mode === "skins"} onChange={() => setMode("skins")} className="mr-2" />{gameCopy.skinsMode}
              </label>
              <label className="flex min-h-11 cursor-not-allowed items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-400">
                <input type="radio" name="silhouette-mode" disabled checked={mode === "expert"} onChange={() => setMode("expert")} className="mr-2" />{gameCopy.expertMode}
              </label>
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">{gameCopy.skinUnavailable}</p>
          </fieldset>
          <p className="mt-4 text-sm font-bold text-slate-600">{bestText}</p>
          {!canPlay ? <p role="status" className="mt-3 text-sm font-bold text-amber-800">{entries.length ? copy.round.insufficient : copy.round.dataUnavailable}</p> : null}
          <button type="button" disabled={!canPlay || mode !== "base"} onClick={startGame} className="mt-5 min-h-11 rounded-lg bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300">{copy.round.start}</button>
        </div>
      ) : null}

      {phase === "playing" && question ? (
        <div className="space-y-4">
          <RoundProgress current={recap.length + 1} completed={recap.length} score={score} copy={copy.round} modeLabel={gameCopy.baseMode} />
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="silhouette-question-title">
            <h2 ref={promptRef} id="silhouette-question-title" tabIndex={-1} className="text-lg font-black text-slate-950 focus:outline-none">{gameCopy.prompt}</h2>
            <div className="mt-4 flex min-h-64 items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:min-h-80">
              <BrawlImage key={question.id + ":" + sessionToken} src={question.imageUrl} alt={gameCopy.imageAlt} fallbackText="?" width={360} height={420} sizes="(max-width: 639px) 90vw, 360px" className="h-64 w-full object-contain brightness-0 sm:h-80" onLoad={() => onImageLoad(question.id, sessionToken)} onError={() => failImage(question.id, sessionToken)} />
              {!imageLoaded ? <span role="status" aria-live="polite" className="sr-only">{copy.round.loading}</span> : null}
            </div>
            <form onSubmit={submitAnswer} className="mt-4 space-y-3">
              <label className="block text-sm font-black text-slate-700" htmlFor="silhouette-answer">{gameCopy.inputLabel}</label>
              <input ref={inputRef} id="silhouette-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={handleInputKeyDown} aria-describedby="silhouette-feedback" autoComplete="off" spellCheck={false} disabled={!imageLoaded || answered} placeholder={gameCopy.inputPlaceholder} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50" />
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={!imageLoaded || answered || !answer.trim()} className="min-h-11 rounded-lg bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300">{gameCopy.submit}</button>
                <button type="button" disabled={!imageLoaded || answered} onClick={skipQuestion} className="min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:text-slate-400">{gameCopy.skip}</button>
                <button type="button" onClick={endSession} className="min-h-11 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 underline-offset-2 hover:text-slate-950 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{copy.round.endSession}</button>
              </div>
            </form>
            <p id="silhouette-feedback" role="status" aria-live="polite" className="mt-3 min-h-6 text-sm font-bold text-slate-700">{imageLoadFailed ? copy.round.imageFailed : feedback}</p>
            {answered ? <button ref={nextRef} type="button" onClick={advance} className="mt-2 min-h-11 rounded-lg bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{recap.length >= SILHOUETTE_QUESTION_COUNT ? copy.round.results : copy.round.next}</button> : null}
          </section>
        </div>
      ) : null}

      {phase === "finished" ? <RoundResults locale={locale} copy={copy.round} score={score} completed={recap.length} best={best} recap={recap} onRestart={restart} earlyEnd={incomplete || recap.length < SILHOUETTE_QUESTION_COUNT} /> : null}
    </section>
  );
}
