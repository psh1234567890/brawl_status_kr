import { numberLocales, type Locale } from "../../i18n/config";

export type QuizBrawler = {
  id: number;
  rawName: string;
  displayName: string;
  imageUrl: string;
};

export type QuizMode = "3m" | "5m" | "10m" | "practice";

export const quizModeSeconds: Record<QuizMode, number | null> = {
  "3m": 180,
  "5m": 300,
  "10m": 600,
  practice: null,
};

export type QuizBest = {
  found: number;
  total: number;
  percentage: number;
  mode: QuizMode;
  recordedAt: string;
};

export const bestStorageKey = "brawl-status:minigames:brawler-quiz:v1:best";

export function normalizeQuizAnswer(value: string, locale: Locale = "en") {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase(numberLocales[locale]);
}

export function buildBrawlerAnswerLookup(brawlers: QuizBrawler[], locale: Locale) {
  const lookup = new Map<string, number>();
  for (const brawler of brawlers) {
    for (const [name, language] of [[brawler.rawName, "en"], [brawler.displayName, locale]] as const) {
      const answer = normalizeQuizAnswer(name, language);
      if (answer && !lookup.has(answer)) lookup.set(answer, brawler.id);
    }
  }
  return lookup;
}

export function evaluateBrawlerAnswer(
  answer: string,
  locale: Locale,
  lookup: Map<string, number>,
  foundIds: ReadonlySet<number>,
): { status: "correct" | "duplicate" | "incorrect"; id?: number } {
  const id = lookup.get(normalizeQuizAnswer(answer, locale)) ?? lookup.get(normalizeQuizAnswer(answer, "en"));
  if (id === undefined) return { status: "incorrect" };
  return foundIds.has(id) ? { status: "duplicate", id } : { status: "correct", id };
}

export function calculateQuizScore(found: number, total: number) {
  return total > 0 ? Math.round((found / total) * 1000) / 10 : 0;
}

export function isQuizComplete(found: number, total: number) {
  return total > 0 && found >= total;
}

export function isBetterBest(candidate: QuizBest, previous?: QuizBest) {
  if (!previous) return true;
  const candidateRatio = candidate.found / candidate.total;
  const previousRatio = previous.found / previous.total;
  if (candidateRatio !== previousRatio) return candidateRatio > previousRatio;
  return candidate.found > previous.found;
}

export function readQuizBests(value: string | null): Partial<Record<QuizMode, QuizBest>> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return {};
    const result: Partial<Record<QuizMode, QuizBest>> = {};
    for (const mode of Object.keys(quizModeSeconds) as QuizMode[]) {
      const entry = (parsed as Record<string, unknown>)[mode];
      if (!entry || typeof entry !== "object") continue;
      const best = entry as Partial<QuizBest>;
      if (
        best.mode === mode &&
        Number.isInteger(best.found) && best.found! >= 0 &&
        Number.isInteger(best.total) && best.total! > 0 && best.found! <= best.total! &&
        typeof best.recordedAt === "string"
      ) {
        result[mode] = {
          found: best.found!, total: best.total!,
          percentage: calculateQuizScore(best.found!, best.total!),
          mode, recordedAt: best.recordedAt,
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}
