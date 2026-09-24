import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Locale } from "../../i18n/config";
import { localizedHref } from "../../i18n/config";
import type { RoundMessages } from "../../i18n/minigames/roundMessages";

export type RoundRecap = { prompt: string; answer: string; wasCorrect: boolean };

export default function RoundResults({ locale, copy, score, completed, best, recap, onRestart, earlyEnd }: {
  locale: Locale;
  copy: RoundMessages;
  score: number;
  completed: number;
  best?: { score: number; percentage: number };
  recap: readonly RoundRecap[];
  onRestart: () => void;
  earlyEnd?: boolean;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  const bestText = best ? copy.best.replace("{score}", String(best.score)).replace("{percentage}", String(best.percentage)) : copy.noBest;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="round-results-title">
      <h2 ref={titleRef} id="round-results-title" tabIndex={-1} className="text-xl font-black text-slate-950 focus:outline-none">{copy.results}</h2>
      <p className="mt-2 text-3xl font-black text-blue-700">{score} / 10 <span className="text-xl text-slate-600">({score * 10}%)</span></p>
      <p className="mt-2 text-sm font-bold text-slate-600">{copy.completed.replace("{completed}", String(completed))}</p>
      {earlyEnd ? <p className="mt-1 text-sm font-bold text-slate-600">{copy.earlyEnd.replace("{completed}", String(completed))}</p> : null}
      <p className="mt-2 text-sm font-bold text-slate-600">{bestText}</p>
      {recap.length ? (
        <div className="mt-5">
          <h3 className="mb-2 text-base font-black text-slate-900">{copy.recap}</h3>
          <ol className="space-y-2">
            {recap.map((item, index) => (
              <li key={index} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-bold text-slate-500">{item.prompt}</p>
                <p className="text-sm font-black text-slate-900">{item.answer}{item.wasCorrect ? " ✓" : ""}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onRestart} className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{copy.restart}</button>
        <Link href={localizedHref(locale, "/minigames")} className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{copy.backToHub}</Link>
      </div>
    </section>
  );
}
