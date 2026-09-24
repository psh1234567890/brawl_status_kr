import type { Locale } from "../../i18n/config";
import { normalizeQuizAnswer, type QuizBrawler } from "./brawlerQuiz";
import { shuffle } from "./random";

export type SilhouetteEntry = QuizBrawler;
export const SILHOUETTE_CANDIDATE_LIMIT = 30;
export const SILHOUETTE_QUESTION_COUNT = 10;

export function buildSilhouetteDeck(
  entries: readonly SilhouetteEntry[],
  rng: () => number = Math.random,
) {
  const eligible = entries.filter((entry) =>
    Number.isInteger(entry.id) && entry.id > 0 && Boolean(entry.rawName.trim()) &&
    Boolean(entry.displayName.trim()) && isBrawlifyImage(entry.imageUrl),
  );
  return shuffle(eligible, rng).slice(0, SILHOUETTE_CANDIDATE_LIMIT);
}

export function matchesSilhouetteAnswer(entry: SilhouetteEntry, answer: string, locale: Locale) {
  const guess = normalizeQuizAnswer(answer, locale);
  return Boolean(guess) && (
    guess === normalizeQuizAnswer(entry.displayName, locale) ||
    guess === normalizeQuizAnswer(entry.rawName, "en")
  );
}

export function isBrawlifyImage(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "cdn.brawlify.com";
  } catch {
    return false;
  }
}
