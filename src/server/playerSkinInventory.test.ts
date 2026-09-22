import { describe, expect, it } from "vitest";
import type { PlayerData, PlayerSkinInventoryResponse } from "../types/brawl";
import {
  buildOfficialSkinInventory,
  mergeSkinInventories,
} from "../utils/playerSkinInventory";

const player = {
  brawlers: [
    {
      id: 16000000,
      name: "SHELLY",
      power: 11,
      trophies: 500,
      highestTrophies: 700,
      skin: { id: 29000001, name: "STAR SHELLY" },
    },
    {
      id: 16000001,
      name: "COLT",
      power: 11,
      trophies: 500,
      highestTrophies: 700,
    },
  ],
} satisfies Pick<PlayerData, "brawlers">;

describe("player skin inventory", () => {
  it("builds a stable equipped-skin baseline from the official player response", () => {
    const result = buildOfficialSkinInventory(player, "ABC123");

    expect(result).toMatchObject({
      coverage: "equipped",
      source: "official",
      supplementalStatus: "disabled",
      tag: "ABC123",
    });
    expect(result.skins).toEqual([
      {
        brawlerName: "SHELLY",
        id: 29000001,
        name: "STAR SHELLY",
        source: "official",
      },
      {
        brawlerName: "COLT",
        name: "COLT",
        source: "official",
      },
    ]);
    expect(result.byBrawler.SHELLY).toHaveLength(1);
    expect(result.byBrawler.COLT).toHaveLength(1);
  });

  it("merges supplemental owned skins without duplicating the equipped skin", () => {
    const official = buildOfficialSkinInventory(player, "ABC123");
    const supplemental: PlayerSkinInventoryResponse = {
      byBrawler: {},
      coverage: "owned",
      skins: [
        { brawlerName: "SHELLY", name: "STAR SHELLY", source: "brawlace" },
        { brawlerName: "SHELLY", name: "WITCH SHELLY", source: "brawlace" },
        { brawlerName: "COLT", name: "ROYAL AGENT COLT", source: "brawlace" },
      ],
      source: "brawlace",
      supplementalStatus: "ready",
      tag: "ABC123",
    };

    const result = mergeSkinInventories(official, supplemental);

    expect(result).toMatchObject({
      coverage: "owned",
      source: "mixed",
      supplementalStatus: "ready",
    });
    expect(result.byBrawler.SHELLY).toHaveLength(2);
    expect(result.byBrawler.COLT).toHaveLength(2);
  });
});
