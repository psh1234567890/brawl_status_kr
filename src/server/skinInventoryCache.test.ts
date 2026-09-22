import { describe, expect, it } from "vitest";
import type { PlayerSkinInventoryResponse } from "../types/brawl";
import { createSkinInventoryCache } from "./skinInventoryCache";

const inventory: PlayerSkinInventoryResponse = {
  byBrawler: {
    SHELLY: [{ brawlerName: "SHELLY", name: "WITCH SHELLY", source: "brawlace" }],
  },
  coverage: "owned",
  skins: [{ brawlerName: "SHELLY", name: "WITCH SHELLY", source: "brawlace" }],
  source: "brawlace",
  supplementalStatus: "ready",
  tag: "ABC123",
};

describe("skin inventory cache", () => {
  it("returns a fresh cached result inside the fresh window", () => {
    const cache = createSkinInventoryCache({ freshMs: 1000, staleMs: 5000 });
    cache.set("ABC123", inventory, 1000);
    expect(cache.getFresh("ABC123", 1500)).toMatchObject({
      supplementalStatus: "ready",
      supplementalCachedAt: new Date(1000).toISOString(),
    });
  });

  it("returns stale data after fresh expiry but before stale expiry", () => {
    const cache = createSkinInventoryCache({ freshMs: 1000, staleMs: 5000 });
    cache.set("ABC123", inventory, 1000);
    expect(cache.getFresh("ABC123", 2500)).toBeNull();
    expect(cache.getStale("ABC123", 2500)).toMatchObject({ supplementalStatus: "stale" });
  });

  it("drops data after the stale window", () => {
    const cache = createSkinInventoryCache({ freshMs: 1000, staleMs: 5000 });
    cache.set("ABC123", inventory, 1000);
    expect(cache.getStale("ABC123", 7000)).toBeNull();
  });
});
