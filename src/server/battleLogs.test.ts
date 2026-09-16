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

    expect(mocks.values).toHaveBeenCalledTimes(1);
    expect(mocks.onConflictDoNothing).toHaveBeenCalledTimes(1);
    const inserted = mocks.values.mock.calls[0]?.[0]?.[0] as
      | { playerTag?: string; battleFingerprint?: string }
      | undefined;
    if (!inserted) throw new Error("expected one inserted battle row");
    expect(inserted.playerTag).toBe("2PYLQ");
    expect(inserted.battleFingerprint).toBe(
      "20260725T010203.000Z|brawlBall|Sneaky Fields|2PYLQ,8PQL,9GRJ",
    );
  });
});
