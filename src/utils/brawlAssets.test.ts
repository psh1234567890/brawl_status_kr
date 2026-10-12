import { describe, expect, it } from "vitest";
import { getRankedLeagueIconUrl } from "./brawlAssets";
import { rankDict } from "../constants/brawl";

describe("verified in-game ranked league image paths", () => {
  it("maps every translated game rank to the correct official artwork league", () => {
    for (const rank of Object.keys(rankDict)) {
      const url = getRankedLeagueIconUrl(rank);
      expect(url, `Rank missing asset: ${rank}`).not.toBeNull();
      const league = rank.startsWith("PRO") ? "Pro" :
        rank.split(" ")[0].toLowerCase().replace(/^./, c => c.toUpperCase());
      expect(url).toBe(`https://cdn.brawlify.com/ranked/regular/${league}.png`);
    }
  });
  it("rejects unknown rank, invalid names and pre-calculated numeric guesses", () => {
    for (const rank of [null, undefined, "", "UNRANKED", "MYTHIC IV", "MYTHIC/../../", "GOLD II.png", "PRO II", "MASTERS XX"]) {
      expect(getRankedLeagueIconUrl(rank)).toBeNull();
    }
    expect(getRankedLeagueIconUrl("  mythic    iii  ")).toBe("https://cdn.brawlify.com/ranked/regular/Mythic.png");
  });
});
