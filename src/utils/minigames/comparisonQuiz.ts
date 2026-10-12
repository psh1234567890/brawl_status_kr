import { shuffle } from "./random";

export type ComparisonEntry = {
  id: number;
  displayName: string;
  imageUrl: string;
  value: number;
};
export type ComparisonQuestion = {
  first: ComparisonEntry;
  second: ComparisonEntry;
  correctId: number;
};

export const COMPARISON_QUESTION_COUNT = 10;

/** Both choices must be distinct, unambiguous and never repeated in a round. */
export function buildComparisonDeck(
  entries: readonly ComparisonEntry[],
  prefer: "higher" | "earlier",
  random: () => number = Math.random,
): ComparisonQuestion[] {
  const seen = new Set<number>();
  const pool = entries.filter(item => {
    if (!Number.isSafeInteger(item.id) || item.id <= 0 || !Number.isSafeInteger(item.value) ||
      item.value <= 0 || !item.displayName.trim() || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  const shuffledPool = shuffle(pool, random);
  const questions: ComparisonQuestion[] = [];
  while (shuffledPool.length >= 2 && questions.length < COMPARISON_QUESTION_COUNT) {
    const first = shuffledPool.pop()!;
    const secondIndex = shuffledPool.findIndex(item => item.value !== first.value);
    if (secondIndex < 0) break;
    const [second] = shuffledPool.splice(secondIndex, 1);
    const firstWins = prefer === "higher" ? first.value > second.value : first.value < second.value;
    questions.push({ first, second, correctId: firstWins ? first.id : second.id });
  }
  return questions.length === COMPARISON_QUESTION_COUNT ? questions : [];
}
