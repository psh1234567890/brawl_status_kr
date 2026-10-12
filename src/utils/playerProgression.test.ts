import { describe, expect, it } from "vitest";
import { calculatePlayerProgression, FULL_POWER_COINS, FULL_POWER_POINTS } from "./playerProgression";
import type { Brawler } from "../types/brawl";

const make = (id: number, power: number, extras: Partial<Brawler> = {}): Brawler => ({
  id, power, name: String(id), trophies: 0, highestTrophies: 0, ...extras,
});

describe("owned Brawler upgrade estimates", () => {
  it("uses standard upgrade costs without charging for abilities", () => {
    const result = calculatePlayerProgression([
      make(1, 1, { gadgets: [{ id: 1, name: "G" }] }), make(2, 11),
    ]);
    expect(result).toMatchObject({
      ownedBrawlers: 2, measuredBrawlers: 2, power11: 1,
      coins: FULL_POWER_COINS, powerPoints: FULL_POWER_POINTS,
      percent: 50, gadgets: 1,
    });
  });
  it("calculates power 10 -> 11 correctly", () => {
    expect(calculatePlayerProgression([make(1, 10)])).toMatchObject({
      coins: 2800, powerPoints: 1440,
      percent: Math.round((1 - 2800 / 7765) * 1000) / 10,
    });
  });
  it("excludes unknown power levels and duplicate brawler IDs", () => {
    expect(calculatePlayerProgression([make(1, 0), make(1, 11), make(2, 12)])).toMatchObject({
      ownedBrawlers: 2, measuredBrawlers: 0, unknownLevels: 2,
      coins: 0, percent: null,
    });
    expect(calculatePlayerProgression([]).percent).toBeNull();
  });
});
