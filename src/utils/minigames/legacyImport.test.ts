import { describe, expect, it } from "vitest";
import { bestStorageKey } from "./brawlerQuiz";
import { readLegacyPersonalBestCandidates } from "./legacyImport";
import { roundRecordStorageKey } from "./roundRecords";

describe("legacy personal best import", () => {
  it("reads only the existing keys, recomputes percentages, and normalizes the silhouette alias", () => {
    const values = new Map<string, string>([
      [
        bestStorageKey,
        JSON.stringify({
          "5m": {
            found: 9,
            total: 10,
            percentage: 1,
            mode: "5m",
            recordedAt: "not-a-date",
          },
          unsupported: { found: 10, total: 10, mode: "unsupported" },
        }),
      ],
      [
        roundRecordStorageKey("silhouette"),
        JSON.stringify({
          base: {
            mode: "base",
            score: 8,
            total: 10,
            percentage: 1,
            recordedAt: "2026-01-01T00:00:00.000Z",
          },
        }),
      ],
    ]);
    const readKeys: string[] = [];
    const result = readLegacyPersonalBestCandidates({
      getItem(key) {
        readKeys.push(key);
        return values.get(key) ?? null;
      },
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      gameId: "brawler-quiz",
      mode: "5m",
      score: 9,
      total: 10,
      clientRecordedAt: null,
    });
    expect(result[1]).toMatchObject({
      gameId: "silhouette-quiz",
      mode: "base",
      score: 8,
      total: 10,
    });
    expect(readKeys).toEqual([
      bestStorageKey,
      roundRecordStorageKey("silhouette"),
      roundRecordStorageKey("map-quiz"),
      roundRecordStorageKey("ability-quiz"),
      roundRecordStorageKey("higher-lower"),
      roundRecordStorageKey("release-order"),
    ]);
  });

  it("imports comparison records without changing the original local keys", () => {
    const records = new Map([
      [roundRecordStorageKey("higher-lower"), JSON.stringify({ standard: { mode: "standard", score: 8, total: 10, recordedAt: "2026-10-12" } })],
      [roundRecordStorageKey("release-order"), JSON.stringify({ standard: { mode: "standard", score: 9, total: 10, recordedAt: "2026-10-12" } })],
    ]);
    const candidates = readLegacyPersonalBestCandidates({ getItem: key => records.get(key) ?? null });
    expect(candidates).toMatchObject([
      { gameId: "higher-lower", mode: "standard", score: 8, total: 10, rulesetVersion: 1 },
      { gameId: "release-order", mode: "standard", score: 9, total: 10, rulesetVersion: 1 },
    ]);
    expect(records.size).toBe(2);
  });

  it("skips malformed and out-of-range records without deleting their original data", () => {
    const original = JSON.stringify({
      standard: { mode: "standard", score: 11, total: 10, recordedAt: "bad" },
    });
    const result = readLegacyPersonalBestCandidates({
      getItem(key) {
        return key === roundRecordStorageKey("map-quiz") ? original : "{";
      },
    });
    expect(result).toEqual([]);
    expect(original).toContain('"score":11');
  });
});
