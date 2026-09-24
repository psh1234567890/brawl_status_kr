import type { Locale } from "../../i18n/config";
import { numberLocales } from "../../i18n/config";
import { shuffle } from "./random";

export type MapQuizEntry = {
  id: number;
  displayName: string;
  imageUrl: string;
  modeId: number;
  modeName: string;
};

export type MapQuizChoice = { id: number; label: string };
export type MapQuizQuestion = MapQuizEntry & { choices: MapQuizChoice[] };
export const MAP_QUESTION_COUNT = 10;
export const MAP_CANDIDATE_LIMIT = 30;

export function normalizeMapAnswer(value: string, locale: Locale) {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase(numberLocales[locale]);
}

export function buildMapQuestionDeck(
  entries: readonly MapQuizEntry[],
  locale: Locale,
  rng: () => number = Math.random,
) {
  const labels = new Set<string>();
  const unique: MapQuizEntry[] = [];
  for (const entry of entries) {
    const label = normalizeMapAnswer(entry.displayName, locale);
    if (!label || labels.has(label) || !validEntry(entry)) continue;
    labels.add(label);
    unique.push(entry);
  }

  const candidates = shuffle(unique, rng).slice(0, MAP_CANDIDATE_LIMIT);
  const candidateLabels = new Set(candidates.map((entry) => normalizeMapAnswer(entry.displayName, locale)));
  return candidates.flatMap((correct) => {
    const sameMode = shuffle(candidates.filter((entry) => entry.id !== correct.id && entry.modeId === correct.modeId), rng);
    const otherModes = shuffle(candidates.filter((entry) => entry.id !== correct.id && entry.modeId !== correct.modeId), rng);
    const choices: MapQuizChoice[] = [{ id: correct.id, label: correct.displayName }];
    const used = new Set([normalizeMapAnswer(correct.displayName, locale)]);
    for (const option of [...sameMode, ...otherModes]) {
      const normalized = normalizeMapAnswer(option.displayName, locale);
      if (!candidateLabels.has(normalized) || used.has(normalized)) continue;
      used.add(normalized);
      choices.push({ id: option.id, label: option.displayName });
      if (choices.length === 4) break;
    }
    if (choices.length !== 4) return [];
    return [{ ...correct, choices: shuffle(choices, rng) }];
  });
}

function validEntry(entry: MapQuizEntry) {
  try {
    const image = new URL(entry.imageUrl);
    return Number.isInteger(entry.id) && entry.id > 0 && Boolean(entry.displayName.trim()) &&
      Number.isInteger(entry.modeId) && entry.modeId > 0 && Boolean(entry.modeName.trim()) &&
      image.protocol === "https:" && image.hostname === "cdn.brawlify.com";
  } catch {
    return false;
  }
}
