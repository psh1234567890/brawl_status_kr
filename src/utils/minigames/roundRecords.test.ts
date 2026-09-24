import { describe, expect, it } from "vitest";
import { mergeRoundBest, readRoundBests, roundRecordStorageKey } from "./roundRecords";

describe("round records", () => {
  it("uses versioned game-specific keys", () => {
    expect(roundRecordStorageKey("map-quiz")).toBe("brawl-status:minigames:map-quiz:v1:best");
  });

  it("only updates completed rounds with a strictly higher score", () => {
    const original = { standard: { mode: "standard" as const, score: 7, total: 10 as const, percentage: 70, recordedAt: "old" } };
    expect(mergeRoundBest(original, "standard", 8, 10, "new").standard?.score).toBe(8);
    expect(mergeRoundBest(original, "standard", 7, 10, "new")).toBe(original);
    expect(mergeRoundBest(original, "standard", 10, 9, "new")).toBe(original);
  });

  it("preserves other modes, recomputes percentage, and rejects malformed data", () => {
    const parsed = readRoundBests(JSON.stringify({
      base: { mode: "base", score: 6, total: 10, percentage: 1, recordedAt: "today" },
      mixed: { mode: "mixed", score: 12, total: 10, recordedAt: "bad" },
    }));
    expect(parsed.base?.percentage).toBe(60);
    expect(parsed.mixed).toBeUndefined();
    expect(mergeRoundBest(parsed, "gadget", 4, 10, "now").base).toEqual(parsed.base);
    expect(readRoundBests("{")).toEqual({});
  });
});
