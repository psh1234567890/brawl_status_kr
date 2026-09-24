import { describe, expect, it } from "vitest";
import { buildSilhouetteDeck, matchesSilhouetteAnswer } from "./silhouetteQuiz";

const entries = [
  { id: 1, rawName: "SHELLY", displayName: "쉘리", imageUrl: "https://cdn.brawlify.com/brawlers/model/1.png" },
  { id: 2, rawName: "COLT", displayName: "콜트", imageUrl: "https://cdn.brawlify.com/brawlers/model/2.png" },
];

describe("silhouette quiz logic", () => {
  it("accepts only exact raw or localized names", () => {
    expect(matchesSilhouetteAnswer(entries[0], " shelly ", "ko")).toBe(true);
    expect(matchesSilhouetteAnswer(entries[0], "쉘리", "ko")).toBe(true);
    expect(matchesSilhouetteAnswer(entries[0], "쉘", "ko")).toBe(false);
  });

  it("limits the shuffled candidate deck and rejects invalid model URLs", () => {
    const extra = Array.from({ length: 35 }, (_, i) => ({
      id: i + 3, rawName: "BRAWLER " + i, displayName: "브롤러 " + i,
      imageUrl: "https://cdn.brawlify.com/brawlers/model/" + (i + 3) + ".png",
    }));
    const deck = buildSilhouetteDeck([...entries, ...extra, { ...entries[0], id: 100, imageUrl: "https://example.com/a.png" }], () => 0);
    expect(deck).toHaveLength(30);
    expect(new Set(deck.map((entry) => entry.id)).size).toBe(30);
    expect(deck.every((entry) => entry.imageUrl.startsWith("https://cdn.brawlify.com/"))).toBe(true);
  });
});
