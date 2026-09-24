import { describe, expect, it } from "vitest";
import { buildAbilityQuestionDeck, type AbilityOwnerChoice, type AbilityQuizEntry } from "./abilityQuiz";

const owners: AbilityOwnerChoice[] = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, displayName: "Brawler " + i, imageUrl: null }));
const gadgets: AbilityQuizEntry[] = Array.from({ length: 24 }, (_, i) => ({
  id: i + 100, kind: "gadget" as const, ownerId: (i % 5) + 1, displayName: "Gadget " + i, imageUrl: null,
}));
const starPowers: AbilityQuizEntry[] = Array.from({ length: 24 }, (_, i) => ({
  id: i + 200, kind: "star-power" as const, ownerId: (i % 5) + 1, displayName: "Star Power " + i, imageUrl: null,
}));
const abilities: AbilityQuizEntry[] = [...gadgets, ...starPowers];

describe("ability owner quiz logic", () => {
  it("generates distinct four-owner choices and filters by mode", () => {
    const deck = buildAbilityQuestionDeck(abilities, owners, "gadget", "en", () => 0);
    expect(deck.length).toBeGreaterThanOrEqual(10);
    expect(deck.every((question) => question.kind === "gadget" && question.choices.length === 4)).toBe(true);
    for (const question of deck) {
      expect(new Set(question.choices.map((owner) => owner.id)).size).toBe(4);
      expect(question.choices.some((owner) => owner.id === question.ownerId)).toBe(true);
    }
  });

  it("returns no impossible question when there are fewer than four owner labels", () => {
    expect(buildAbilityQuestionDeck(abilities, owners.slice(0, 3), "mixed", "en", () => 0)).toEqual([]);
  });
});
