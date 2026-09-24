import type { RoundMessages } from "../../i18n/minigames/roundMessages";

export default function RoundProgress({ current, completed, score, copy, modeLabel }: {
  current: number;
  completed: number;
  score: number;
  copy: RoundMessages;
  modeLabel?: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label={copy.tenQuestions}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-700">{copy.question} {Math.min(current, 10)} / 10</p>
        <p className="text-sm font-black text-blue-700">{copy.score}: {score} / 10</p>
        {modeLabel ? <p className="text-xs font-bold text-slate-500">{modeLabel}</p> : null}
      </div>
      <div role="progressbar" aria-label={copy.completed.replace("{completed}", String(completed))} aria-valuenow={completed} aria-valuemin={0} aria-valuemax={10} className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-600 motion-reduce:transition-none" style={{ width: (completed * 10) + "%" }} />
      </div>
    </section>
  );
}
