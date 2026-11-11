import { describe, expect, it } from "vitest";
import { legacyMetaScore } from "./metaScore";

describe("legacy-v1 recommendation scoring compatibility", () => {
  it("preserves both rounding steps across sample sizes", () => {
    for (const plays of [5, 7, 10, 19, 50, 100, 4319]) {
      for (let wins = 0; wins <= plays; wins++) {
        const winRate = Math.floor((wins / plays) * 100);
        expect(legacyMetaScore(wins, plays)).toEqual({ winRate, score: Math.floor((winRate * plays) / (plays + 5)) });
      }
    }
  });
});
