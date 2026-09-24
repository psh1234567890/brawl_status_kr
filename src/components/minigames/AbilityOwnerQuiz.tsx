"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BrawlImage from "../BrawlImage";
import { numberLocales, type Locale } from "../../i18n/config";
import { getMinigameMessages } from "../../i18n/minigameMessages";
import { buildAbilityQuestionDeck, type AbilityOwnerChoice, type AbilityQuizEntry, type AbilityQuizMode, type AbilityQuizQuestion } from "../../utils/minigames/abilityQuiz";
import { useRoundBest } from "./useRoundBest";
import RoundProgress from "./RoundProgress";
import QuizChoiceGrid from "./QuizChoiceGrid";
import RoundResults, { type RoundRecap } from "./RoundResults";

type Phase = "ready" | "playing" | "finished";

export default function AbilityOwnerQuiz({ locale, abilities, owners }: {
  locale: Locale;
  abilities: AbilityQuizEntry[];
  owners: AbilityOwnerChoice[];
}) {
  const copy = getMinigameMessages(locale);
  const gameCopy = copy.abilityQuiz;
  const [phase, setPhase] = useState<Phase>("ready");
  const [mode, setMode] = useState<AbilityQuizMode>("mixed");
  const [deck, setDeck] = useState<AbilityQuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [recap, setRecap] = useState<RoundRecap[]>([]);
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [incomplete, setIncomplete] = useState(false);
  const [poolError, setPoolError] = useState(false);
  const answeredRef = useRef(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const { best, record } = useRoundBest("ability-quiz", mode);
  const score = useMemo(() => recap.filter((item) => item.wasCorrect).length, [recap]);
  const question = deck[index];
  const modeAbilities = abilities.filter((ability) => mode === "mixed" || ability.kind === mode);
  const modeLabels: Record<AbilityQuizMode, string> = { mixed: gameCopy.mixed, gadget: gameCopy.gadgets, "star-power": gameCopy.starPowers };
  const canPlay = modeAbilities.length >= 10 && owners.length >= 4;

  useEffect(() => {
    if (phase === "playing" && answered) nextRef.current?.focus();
    if (phase === "playing" && !answered) promptRef.current?.focus();
    if (phase === "finished") record(score, recap.length);
  }, [answered, phase, recap.length, record, score]);

  function startGame() {
    const nextDeck = buildAbilityQuestionDeck(abilities, owners, mode, locale);
    if (nextDeck.length < 10) {
      setPoolError(true);
      return;
    }
    setPoolError(false);
    setDeck(nextDeck);
    setIndex(0);
    setRecap([]);
    setSelectedId(undefined);
    setAnswered(false);
    answeredRef.current = false;
    setFeedback("");
    setIncomplete(false);
    setPhase("playing");
  }

  function choose(id: number) {
    if (phase !== "playing" || !question || answeredRef.current) return;
    const selected = question.choices.find((owner) => owner.id === id);
    if (!selected) return;
    const correct = id === question.ownerId;
    const rightOwner = owners.find((owner) => owner.id === question.ownerId);
    answeredRef.current = true;
    setSelectedId(id);
    setAnswered(true);
    setRecap((items) => [...items, { prompt: gameCopy.prompt + " " + question.displayName, answer: rightOwner?.displayName ?? "", wasCorrect: correct }]);
    setFeedback(correct ? copy.round.correct : copy.round.incorrect + " " + (rightOwner?.displayName ?? ""));
  }

  function advance() {
    if (!answered) return;
    if (recap.length >= 10) {
      setPhase("finished");
      return;
    }
    if (index + 1 >= deck.length) {
      setIncomplete(true);
      setPhase("finished");
      return;
    }
    answeredRef.current = false;
    setAnswered(false);
    setSelectedId(undefined);
    setFeedback("");
    setIndex((current) => current + 1);
  }

  function endSession() {
    setIncomplete(recap.length < 10);
    setPhase("finished");
  }

  function restart() {
    setPhase("ready");
    setDeck([]);
    setIndex(0);
    setRecap([]);
    setSelectedId(undefined);
    setAnswered(false);
    answeredRef.current = false;
    setFeedback("");
    setIncomplete(false);
  }

  const bestText = best ? copy.round.best.replace("{score}", String(best.score)).replace("{percentage}", String(best.percentage)) : copy.round.noBest;

  return (
    <section className="space-y-4" aria-label={gameCopy.title}>
      {phase === "ready" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium leading-6 text-slate-600">{gameCopy.rules}</p>
          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-black text-slate-700">{copy.round.chooseMode}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(modeLabels) as AbilityQuizMode[]).map((option) => <label key={option} className={`flex min-h-11 cursor-pointer items-center rounded-lg border px-3 py-2 text-sm font-bold ${mode === option ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-700"}`}>
                <input type="radio" name="ability-mode" value={option} checked={mode === option} onChange={() => { setMode(option); setPoolError(false); }} className="mr-2 accent-blue-600" />{modeLabels[option]}
              </label>)}
            </div>
          </fieldset>
          <p className="mt-3 text-sm font-black text-blue-700">{gameCopy.pool.replace("{count}", modeAbilities.length.toLocaleString(numberLocales[locale]))}</p>
          <p className="mt-3 text-xs font-bold text-slate-500">{copy.round.tenQuestions}</p>
          <p className="mt-4 text-sm font-bold text-slate-600">{bestText}</p>
          {!canPlay || poolError ? <p role="status" className="mt-3 text-sm font-bold text-amber-800">{abilities.length ? gameCopy.noAbilities : copy.round.dataUnavailable}</p> : null}
          <button type="button" disabled={!canPlay || poolError} onClick={startGame} className="mt-5 min-h-11 rounded-lg bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300">{copy.round.start}</button>
        </div>
      ) : null}

      {phase === "playing" && question ? (
        <div className="space-y-4">
          <RoundProgress current={recap.length + 1} completed={recap.length} score={score} copy={copy.round} modeLabel={modeLabels[mode]} />
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="ability-question-title">
            <div className="flex items-center gap-4">
              {question.imageUrl ? <BrawlImage key={question.id} src={question.imageUrl} alt={gameCopy.imageAlt} fallbackText="?" width={64} height={64} sizes="64px" className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-contain" /> : <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-2xl font-black text-slate-300">?</span>}
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">{question.kind === "gadget" ? gameCopy.gadget : gameCopy.starPower}</p>
                <h2 ref={promptRef} id="ability-question-title" tabIndex={-1} className="mt-1 text-lg font-black text-slate-950 focus:outline-none">{gameCopy.prompt}</h2>
                <p className="mt-1 text-sm font-bold text-slate-700">{question.displayName}</p>
              </div>
            </div>
            <h3 className="mb-3 mt-5 text-sm font-black text-slate-700">{copy.round.question} {recap.length + 1} / 10</h3>
            <QuizChoiceGrid choices={question.choices.map((owner) => ({ id: owner.id, label: owner.displayName }))} disabled={answered} selectedId={selectedId} correctId={answered ? question.ownerId : undefined} onChoose={choose} correctLabel={copy.round.correct} selectedLabel={copy.round.incorrect} groupLabel={gameCopy.prompt} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p role="status" aria-live="polite" className="min-h-6 text-sm font-bold text-slate-700">{feedback}</p>
              <button type="button" onClick={endSession} className="min-h-11 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 underline-offset-2 hover:text-slate-950 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{copy.round.endSession}</button>
            </div>
            {answered ? <button ref={nextRef} type="button" onClick={advance} className="mt-2 min-h-11 rounded-lg bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{recap.length >= 10 ? copy.round.results : copy.round.next}</button> : null}
          </section>
        </div>
      ) : null}

      {phase === "finished" ? <RoundResults locale={locale} copy={copy.round} score={score} completed={recap.length} best={best} recap={recap} onRestart={restart} earlyEnd={incomplete || recap.length < 10} /> : null}
    </section>
  );
}
