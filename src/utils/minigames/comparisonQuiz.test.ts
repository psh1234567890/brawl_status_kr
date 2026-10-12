import { describe, expect, it } from "vitest";
import { buildComparisonDeck, type ComparisonEntry } from "./comparisonQuiz";
import { releaseChronology } from "./releaseChronology";

const entries: ComparisonEntry[] = Array.from({ length: 35 }, (_, index) => ({
  id: index + 1, displayName: "Player " + index, imageUrl: "", value: index + 100,
}));
describe("comparison quiz questions", () => {
  it("builds 10 nonrepeating, tie-free questions in both directions", () => {
    for (const kind of ["higher", "earlier"] as const) {
      const deck = buildComparisonDeck(entries, kind, () => 0.31);
      expect(deck).toHaveLength(10);
      const ids = deck.flatMap(question => [question.first.id, question.second.id]);
      expect(new Set(ids).size).toBe(20);
      for (const q of deck) {
        expect(q.first.value).not.toBe(q.second.value);
        const winner = kind === "higher"
          ? (q.first.value > q.second.value ? q.first : q.second)
          : (q.first.value < q.second.value ? q.first : q.second);
        expect(q.correctId).toBe(winner.id);
      }
    }
  });
  it("rejects insufficient and ambiguous pools", () => {
    expect(buildComparisonDeck(entries.slice(0, 19), "higher")).toEqual([]);
    expect(buildComparisonDeck(entries.map(item => ({ ...item, value: 1 })), "earlier")).toEqual([]);
  });
  it("curated dates are explicit, valid and not in the future", () => {
    const values = Object.values(releaseChronology);
    expect(values.length).toBeGreaterThan(30);
    for (const value of values) {
      expect(value).toMatch(/^20\d\d-\d\d-\d\d$/);
      expect(new Date(value + "T00:00:00.000Z").toISOString().slice(0, 10)).toBe(value);
      expect(value <= "2026-10-12").toBe(true);
    }
  });
});
