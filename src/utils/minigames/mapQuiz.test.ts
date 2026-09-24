import { describe, expect, it } from "vitest";
import { buildMapQuestionDeck, normalizeMapAnswer, type MapQuizEntry } from "./mapQuiz";

const maps: MapQuizEntry[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1, displayName: "Map " + i, imageUrl: "https://cdn.brawlify.com/maps/" + (i + 1) + ".png",
  modeId: i < 6 ? 1 : 2, modeName: i < 6 ? "Gem Grab" : "Solo Showdown",
}));

describe("map quiz logic", () => {
  it("normalizes Unicode, case, and repeated whitespace", () => {
    expect(normalizeMapAnswer("  ＭＡＰ   Name ", "en")).toBe("map name");
  });

  it("builds ten unique image prompts and four distinct choices", () => {
    const questions = buildMapQuestionDeck(maps, "en", () => 0).slice(0, 10);
    expect(questions).toHaveLength(10);
    expect(new Set(questions.map((question) => question.id)).size).toBe(10);
    for (const question of questions) {
      expect(question.choices).toHaveLength(4);
      expect(new Set(question.choices.map((choice) => normalizeMapAnswer(choice.label, "en"))).size).toBe(4);
      expect(question.choices.some((choice) => choice.id === question.id)).toBe(true);
    }
  });

  it("excludes duplicate localized labels and unusable images", () => {
    const duplicate = { ...maps[0], id: 20, displayName: "  MAP   0 " };
    const questions = buildMapQuestionDeck([...maps, duplicate, { ...maps[1], id: 22, imageUrl: "https://elsewhere.test/map.png" }], "en", () => 0);
    expect(questions.some((question) => question.id === 20 || question.id === 22)).toBe(false);
  });
});
