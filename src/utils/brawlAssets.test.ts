import { describe, expect, it } from "vitest";
import { getBrawlerPortraitSources, getRankedLeagueIconUrl } from "./brawlAssets";
import { rankDict } from "../constants/brawl";

describe("catalog portrait recovery", () => {
  it("uses the supplied avatar ID after the preferred artwork fails", () => {
    expect(getBrawlerPortraitSources({ id: 16000110, avatarId: 28001338,
      imageUrl2: "https://cdn.brawlify.com/brawlers/borderless/16000110.png",
      imageUrl: "https://cdn.brawlify.com/brawlers/borders/16000110.png" })).toEqual([
      "https://cdn.brawlify.com/brawlers/borderless/16000110.png",
      "https://cdn.brawlify.com/brawlers/borders/16000110.png",
      "https://cdn.brawlify.com/profile-icons/regular/28001338.png",
    ]);
  });
  it("never guesses an avatar ID or retries duplicate URLs", () => {
    expect(getBrawlerPortraitSources({ id: 16000000, imageUrl: "https://cdn.brawlify.com/brawlers/borders/16000000.png" })).toEqual(["https://cdn.brawlify.com/brawlers/borders/16000000.png"]);
    expect(getBrawlerPortraitSources({ id: 16000000, avatarId: -1 })).toEqual(["https://cdn.brawlify.com/brawlers/borders/16000000.png"]);
  });
});

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
