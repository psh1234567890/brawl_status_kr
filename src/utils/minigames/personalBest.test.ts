import { describe, expect, it } from "vitest";
import {
  comparePersonalBest,
  mergePersonalBestRecords,
  parsePersonalBestCandidate,
  type PersonalBestRecord,
} from "./personalBest";

describe("personal best rules", () => {
  it("compares ratios without rounding, then prefers a larger score on an exact ratio tie", () => {
    expect(comparePersonalBest({ score: 9, total: 10 }, { score: 80, total: 100 })).toBe(1);
    expect(comparePersonalBest({ score: 90, total: 100 }, { score: 9, total: 10 })).toBe(1);
    expect(comparePersonalBest({ score: 9, total: 10 }, { score: 90, total: 100 })).toBe(-1);
    expect(comparePersonalBest({ score: 10, total: 10 }, { score: 10, total: 10 })).toBe(0);
    // Both values round to 66.67%, but exact cross multiplication prefers 6667/10000.
    expect(comparePersonalBest({ score: 6_667, total: 10_000 }, { score: 2, total: 3 })).toBe(1);
  });

  it("rejects unknown slots, bad totals, and unsafe integer scores", () => {
    expect(() =>
      parsePersonalBestCandidate({
        gameId: "map-quiz",
        mode: "easy",
        rulesetVersion: 1,
        score: 8,
        total: 10,
      }),
    ).toThrow();
    expect(() =>
      parsePersonalBestCandidate({
        gameId: "ability-quiz",
        mode: "gadget",
        rulesetVersion: 1,
        score: 8,
        total: 9,
      }),
    ).toThrow();
    expect(() =>
      parsePersonalBestCandidate({
        gameId: "brawler-quiz",
        mode: "5m",
        rulesetVersion: 1,
        score: Number.MAX_SAFE_INTEGER + 1,
        total: 100,
      }),
    ).toThrow();
  });

  it("rejects ruleset versions that have not been intentionally introduced", () => {
    for (const rulesetVersion of [0, 2, 32_767]) {
      expect(() => parsePersonalBestCandidate({
        gameId: "map-quiz",
        mode: "standard",
        rulesetVersion,
        score: 8,
        total: 10,
      })).toThrowError("INVALID_RULESET_VERSION");
    }
  });

  it("normalizes dates and ignores client supplied percentages", () => {
    const candidate = parsePersonalBestCandidate({
      gameId: "brawler-quiz",
      mode: "5m",
      rulesetVersion: 1,
      score: 8,
      total: 10,
      clientRecordedAt: "not-a-date",
    });
    expect(candidate).toEqual({
      gameId: "brawler-quiz",
      mode: "5m",
      rulesetVersion: 1,
      score: 8,
      total: 10,
      clientRecordedAt: null,
    });
  });

  it("keeps modes separate and preserves an exact tie", () => {
    const record: PersonalBestRecord = {
      gameId: "map-quiz",
      mode: "standard",
      rulesetVersion: 1,
      score: 9,
      total: 10,
      clientRecordedAt: null,
      source: "client_play",
      revision: 4,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const records = [record];
    expect(
      mergePersonalBestRecords(records, { ...record, score: 9 }, "legacy_import"),
    ).toBe(records);
    expect(() => parsePersonalBestCandidate({
      gameId: "map-quiz",
      mode: "standard",
      rulesetVersion: 2,
      score: 8,
      total: 10,
    })).toThrowError("INVALID_RULESET_VERSION");
  });
});
