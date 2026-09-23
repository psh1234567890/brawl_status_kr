import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BattleLogItem } from "../types/brawl";

const mocks = vi.hoisted(() => {
  const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn((input: unknown[]) => ({ onConflictDoNothing, input }));
  const insert = vi.fn(() => ({ values }));
  return { insert, onConflictDoNothing, values };
});

vi.mock("../db", () => ({
  db: {
    insert: mocks.insert,
  },
}));

import { saveBattleLogs } from "./battleLogs";

describe("battle log persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not execute an insert for an empty battle log", async () => {
    await saveBattleLogs("2PYLQ", []);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("uses conflict-safe insertion with the stable battle fingerprint", async () => {
    const item = {
      battleTime: "20260725T010203.000Z",
      event: { mode: "brawlBall", map: "Sneaky Fields" },
      battle: {
        type: "ranked",
        result: "victory",
        teams: [
          [
            { tag: "#2PYLQ", name: "A", brawler: { id: 1, name: "SHELLY", power: 11, trophies: 500 } },
            { tag: "#8PQL", name: "B", brawler: { id: 2, name: "COLT", power: 11, trophies: 500 } },
          ],
          [
            { tag: "#9GRJ", name: "C", brawler: { id: 3, name: "BULL", power: 11, trophies: 500 } },
          ],
        ],
      },
    } as BattleLogItem;

    await saveBattleLogs("2PYLQ", [item]);

    expect(mocks.values).toHaveBeenCalledTimes(2);
    expect(mocks.onConflictDoNothing).toHaveBeenCalledTimes(2);
    const inserted = mocks.values.mock.calls[0]?.[0]?.[0] as
      | {
          playerTag?: string;
          battleFingerprint?: string;
          playerTeamIndex?: number | null;
          metaPerspectiveOnly?: boolean;
        }
      | undefined;
    if (!inserted) throw new Error("expected one inserted battle row");
    expect(inserted.playerTag).toBe("2PYLQ");
    expect(inserted.battleFingerprint).toBe(
      "20260725T010203.000Z|brawlBall|Sneaky Fields|2PYLQ,8PQL,9GRJ",
    );
    expect(inserted.playerTeamIndex).toBe(1);
    expect(inserted.metaPerspectiveOnly).toBe(false);

    const participants = mocks.values.mock.calls[1]?.[0] as
      | Array<{
          playerTag?: string;
          teamIndex?: number;
          brawlerName?: string;
          result?: string;
          battleFingerprint?: string;
        }>
      | undefined;
    expect(participants).toHaveLength(3);
    expect(participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerTag: "2PYLQ",
          teamIndex: 1,
          brawlerName: "SHELLY",
          result: "victory",
        }),
        expect.objectContaining({
          playerTag: "8PQL",
          teamIndex: 1,
          brawlerName: "COLT",
          result: "victory",
        }),
        expect.objectContaining({
          playerTag: "9GRJ",
          teamIndex: 2,
          brawlerName: "BULL",
          result: "defeat",
        }),
      ]),
    );
    expect(participants?.every((row) => row.battleFingerprint === inserted.battleFingerprint)).toBe(true);
  });

  it("stores perspective-only matches without creating team participant rows", async () => {
    const item = {
      battleTime: "20260725T010203.000Z",
      event: { mode: "soloShowdown", map: "Rockwall Brawl" },
      battle: {
        type: "ranked",
        rank: 2,
        players: [
          { tag: "#2PYLQ", brawler: { id: 1, name: "SHELLY", power: 11, trophies: 500 } },
        ],
      },
    } as BattleLogItem;

    await saveBattleLogs("2PYLQ", [item]);

    expect(mocks.values).toHaveBeenCalledTimes(1);
    const inserted = mocks.values.mock.calls[0]?.[0]?.[0] as
      | { metaPerspectiveOnly?: boolean; playerTeamIndex?: number | null }
      | undefined;
    expect(inserted?.metaPerspectiveOnly).toBe(true);
    expect(inserted?.playerTeamIndex).toBeNull();
  });
});
