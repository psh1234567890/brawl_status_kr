import { describe, expect, it } from "vitest";
import {
  buildBrawlerAnswerLookup,
  calculateQuizScore,
  evaluateBrawlerAnswer,
  isBetterBest,
  isQuizComplete,
  normalizeQuizAnswer,
  readQuizBests,
  type QuizBest,
  type QuizBrawler,
} from "./brawlerQuiz";

const brawlers: QuizBrawler[] = [
  { id: 1, rawName: "SHELLY", displayName: "쉘리", imageUrl: "" },
  { id: 2, rawName: "EL PRIMO", displayName: "엘 프리모", imageUrl: "" },
];

describe("brawler name quiz logic", () => {
  it("accepts raw English and localized Korean answers by brawler ID", () => {
    const lookup = buildBrawlerAnswerLookup(brawlers, "ko");
    expect(evaluateBrawlerAnswer("shelly", "ko", lookup, new Set())).toEqual({ status: "correct", id: 1 });
    expect(evaluateBrawlerAnswer("쉘리", "ko", lookup, new Set())).toEqual({ status: "correct", id: 1 });
  });

  it("accepts localized Japanese and handles case and repeated whitespace", () => {
    const japanese = [{ ...brawlers[1], displayName: "エル・プリモ" }];
    const lookup = buildBrawlerAnswerLookup(japanese, "ja");
    expect(normalizeQuizAnswer("  EL   PRIMO  ")).toBe("el primo");
    expect(evaluateBrawlerAnswer("  El   Primo ", "ja", lookup, new Set())).toEqual({ status: "correct", id: 2 });
    expect(evaluateBrawlerAnswer("エル・プリモ", "ja", lookup, new Set())).toEqual({ status: "correct", id: 2 });
  });

  it("does not increment for duplicates or incorrect names", () => {
    const lookup = buildBrawlerAnswerLookup(brawlers, "ko");
    expect(evaluateBrawlerAnswer(" SHELLY ", "ko", lookup, new Set([1]))).toEqual({ status: "duplicate", id: 1 });
    expect(evaluateBrawlerAnswer("not a brawler", "ko", lookup, new Set())).toEqual({ status: "incorrect" });
  });

  it("completes only when every released brawler is found and calculates percentage", () => {
    expect(isQuizComplete(1, 2)).toBe(false);
    expect(isQuizComplete(2, 2)).toBe(true);
    expect(isQuizComplete(0, 0)).toBe(false);
    expect(calculateQuizScore(2, 3)).toBe(66.7);
    expect(calculateQuizScore(0, 0)).toBe(0);
  });

  it("compares personal bests by percentage when totals change", () => {
    const previous: QuizBest = { found: 100, total: 106, percentage: calculateQuizScore(100, 106), mode: "5m", recordedAt: "2026-01-01" };
    const worse: QuizBest = { found: 101, total: 110, percentage: calculateQuizScore(101, 110), mode: "5m", recordedAt: "2026-02-01" };
    const better: QuizBest = { found: 104, total: 110, percentage: calculateQuizScore(104, 110), mode: "5m", recordedAt: "2026-02-02" };
    expect(isBetterBest(worse, previous)).toBe(false);
    expect(isBetterBest(better, previous)).toBe(true);
    expect(isBetterBest(previous)).toBe(true);
    const roundedTie: QuizBest = { found: 1, total: 108, percentage: 0.9, mode: "5m", recordedAt: "2026-02-03" };
    const slightlyBetter: QuizBest = { found: 1, total: 106, percentage: 0.9, mode: "5m", recordedAt: "2026-02-04" };
    expect(isBetterBest(roundedTie, slightlyBetter)).toBe(false);
    expect(isBetterBest(slightlyBetter, roundedTie)).toBe(true);
  });

  it("reads only valid per-mode records from localStorage", () => {
    const stored = readQuizBests(JSON.stringify({
      "5m": { found: 100, total: 106, percentage: 999, mode: "5m", recordedAt: "2026-01-01" },
      practice: { found: 20, total: 10, mode: "practice", recordedAt: "2026-01-01" },
    }));
    expect(stored["5m"]?.percentage).toBe(94.3);
    expect(stored.practice).toBeUndefined();
    expect(readQuizBests("invalid json")).toEqual({});
  });
});
