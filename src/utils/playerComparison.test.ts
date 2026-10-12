import { describe, expect, it } from "vitest";
import type { PlayerData } from "../types/brawl";
import { comparisonPath, comparisonPrefillTags, higherValueSide, summarizeComparedPlayer, validatedComparisonTags } from "./playerComparison";

const example = {
  tag: "#2PY", name: "Alpha", trophies: 50000, highestTrophies: 52000,
  expLevel: 140, "3vs3Victories": 1000, soloVictories: 80, duoVictories: 30,
  brawlers: [
    { id: 1, name: "SHELLY", power: 11, trophies: 500, highestTrophies: 800, gadgets: [{ id: 3, name: "G" }] },
    { id: 2, name: "COLT", power: 1, trophies: 800, highestTrophies: 900, starPowers: [{ id: 4, name: "S" }] },
  ],
} satisfies PlayerData;

describe("player comparison", () => {
  it("normalizes two different official player tags", () => {
    expect(validatedComparisonTags(" #2py ", " #p0y ")).toEqual({ left: "2PY", right: "P0Y" });
    expect(validatedComparisonTags("#2PY", "2py")).toBeNull();
    expect(validatedComparisonTags("unsafe<script>", "2PY")).toBeNull();
    expect(comparisonPath("/en/compare", "#2py", "p0y")).toBe("/en/compare?a=2PY&b=P0Y");
    expect(comparisonPath("/compare", "INVALID", "2PY")).toBe("/compare");
  });

  it("supports a single shared player tag without requesting an incomplete comparison", () => {
    expect(comparisonPrefillTags("#2py", "")).toEqual({ left: "2PY", right: "" });
    expect(comparisonPrefillTags("#2py", "#2py")).toEqual({ left: "2PY", right: "" });
    expect(comparisonPrefillTags("<script>", "#p0y")).toEqual({ left: "", right: "P0Y" });
  });

  it("compares only profile and owned brawler data without fabricated rates", () => {
    const actual = summarizeComparedPlayer(example);
    expect(actual).toMatchObject({
      trophies: 50000, victories3v3: 1000, brawlers: 2, power11: 1,
      upgradePercent: 50, upgradesCoins: 7765, gadgets: 1, starPowers: 1,
    });
    expect(actual.topBrawlers.map((b) => b.name)).toEqual(["COLT", "SHELLY"]);
  });

  it("does not indicate a winner when numbers tie or are unknown", () => {
    expect(higherValueSide(200, 100)).toBe("a");
    expect(higherValueSide(200, 300)).toBe("b");
    expect(higherValueSide(0, 0)).toBeNull();
    expect(higherValueSide(null, 300)).toBeNull();
  });
});
