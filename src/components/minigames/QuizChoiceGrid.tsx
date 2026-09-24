export type QuizChoice = { id: number; label: string; imageUrl?: string | null };

export default function QuizChoiceGrid({ choices, disabled, selectedId, correctId, onChoose, correctLabel, selectedLabel, groupLabel }: {
  choices: readonly QuizChoice[];
  disabled: boolean;
  selectedId?: number;
  correctId?: number;
  onChoose: (id: number) => void;
  correctLabel: string;
  selectedLabel: string;
  groupLabel: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={groupLabel}>
      {choices.map((choice) => {
        const isCorrect = correctId === choice.id;
        const isSelected = selectedId === choice.id;
        return (
          <button
            key={choice.id}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            onClick={() => onChoose(choice.id)}
            className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-default ${isCorrect ? "border-emerald-600 bg-emerald-50 text-emerald-900" : isSelected ? "border-rose-500 bg-rose-50 text-rose-900" : "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50"}`}
          >
            <span>{choice.label}</span>
            {isCorrect ? <span className="text-xs font-black">{correctLabel}</span> : isSelected && correctId !== undefined ? <span className="text-xs font-black">{selectedLabel}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
