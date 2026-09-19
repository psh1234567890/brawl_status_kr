import { describe, expect, it } from "vitest";
import type { BattleLogItem } from "../types/brawl";
import {
  calculateBrawlerStats,
  calculateRecentBattleSummary,
  createBattleFingerprint,
  getNormalizedBattleResult,
  getPlayerBrawler,
  parseBattleTime,
} from "./brawlHelpers";

function battle(
  overrides: Partial<BattleLogItem["battle"]> = {},
  mode = "brawlBall",
): BattleLogItem {
  return {
    battleTime: "20260603T123456.000Z",
    event: { mode, map: "Test Map" },
    battle: {
      result: "victory",
      players: [{ tag: "#2Q89RU", brawler: { id: 1, name: "SHELLY" } }],
      ...overrides,
    },
  };
}

describe("getNormalizedBattleResult", () => {
  it("uses showdown rank when the upstream result is missing", () => {
    expect(getNormalizedBattleResult(battle({ result: undefined, rank: 3 }, "soloShowdown"))).toBe("victory");
    expect(getNormalizedBattleResult(battle({ result: undefined, rank: 5 }, "soloShowdown"))).toBe("defeat");
    expect(getNormalizedBattleResult(battle({ result: undefined, rank: 2 }, "duoShowdown"))).toBe("victory");
  });

  it("keeps the upstream result for regular modes", () => {
    expect(getNormalizedBattleResult(battle({ result: "defeat" }))).toBe("defeat");
    expect(getNormalizedBattleResult(battle({ result: undefined }))).toBe("draw");
  });
});

describe("battle log helpers", () => {
  it.each([0, 1])("keeps the searched-player perspective in team %i", (teamIndex) => {
    const searched = [{ tag: "#2Q89RU", brawler: { id: 1, name: "SHELLY" } }];
    const opponent = [{ tag: "#8PQL", brawler: { id: 2, name: "COLT" } }];
    for (const result of ["victory", "defeat", "draw"] as const) {
      const item = battle({ players: undefined, teams: teamIndex === 0 ? [searched, opponent] : [opponent, searched], result });
      expect(getPlayerBrawler(item, "2Q89RU")?.name).toBe("SHELLY");
      expect(getNormalizedBattleResult(item)).toBe(result);
    }
  });

  it.each(["duoShowdown", "trioShowdown"])("uses rank boundaries for %s", (mode) => {
    expect(getNormalizedBattleResult(battle({ result: "defeat", rank: 2 }, mode))).toBe("victory");
    expect(getNormalizedBattleResult(battle({ result: "victory", rank: 3 }, mode))).toBe("defeat");
  });

  it("identifies the same battle from opposite team perspectives", () => {
    const teams = [[{ tag: "#2Q89RU" }], [{ tag: "#8PQL" }]];
    const first = battle({ players: undefined, teams, result: "victory" });
    const second = battle({ players: undefined, teams: [...teams].reverse(), result: "defeat" });
    expect(createBattleFingerprint(first)).toBe(createBattleFingerprint(second));
    expect(createBattleFingerprint({ ...second, battleTime: "20260603T123500.000Z" })).not.toBe(createBattleFingerprint(first));
  });

  it("creates a stable fingerprint regardless of player ordering", () => {
    const first = battle({
      players: [{ tag: "#ABC" }, { tag: "#2Q89RU" }],
    });
    const second = battle({
      players: [{ tag: "#2Q89RU" }, { tag: "#ABC" }],
    });
    expect(createBattleFingerprint(first)).toBe(createBattleFingerprint(second));
  });

  it("summarizes recent matches and player brawler matches", () => {
    const items = [
      battle({ result: "victory" }),
      { ...battle({ result: "defeat" }), battleTime: "20260602T123456.000Z" },
    ];
    expect(calculateRecentBattleSummary({ items })).toMatchObject({
      wins: 1,
      defeats: 1,
      total: 2,
      winRate: 50,
      streakCount: 2,
    });
    expect(calculateBrawlerStats({ items }, "#2Q89RU", "SHELLY")).toMatchObject({
      plays: 2,
      wins: 1,
      winRate: 50,
    });
  });

  it("excludes friendly battles from statistical summaries", () => {
    const items = [
      battle({ result: "victory" }),
      { ...battle({ result: "defeat", type: "friendly" }), battleTime: "20260602T123456.000Z" },
    ];

    expect(calculateRecentBattleSummary({ items })).toMatchObject({
      wins: 1,
      defeats: 0,
      total: 1,
      winRate: 100,
    });
    expect(calculateBrawlerStats({ items }, "#2Q89RU", "SHELLY")).toMatchObject({
      plays: 1,
      wins: 1,
      winRate: 100,
    });
  });

  it("parses Supercell battle timestamps", () => {
    expect(parseBattleTime("20260603T123456.789Z")?.toISOString()).toBe(
      "2026-06-03T12:34:56.789Z",
    );
  });
});
