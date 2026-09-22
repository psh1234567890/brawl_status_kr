import { describe, expect, it } from "vitest";
import type { PlayerSkinInventoryResponse } from "../types/brawl";
import {
  PLAYER_SKIN_CACHE_MAX_ENTRIES,
  PLAYER_SKIN_CACHE_PREFIX,
  prunePlayerSkinCache,
  readPlayerSkinCache,
  writePlayerSkinCache,
} from "./playerSkinCache";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

function ownedInventory(tag: string): PlayerSkinInventoryResponse {
  return {
    tag,
    source: "brawlace",
    coverage: "owned",
    supplementalStatus: "ready",
    skins: [{ brawlerName: "SHELLY", name: "WITCH SHELLY", source: "brawlace" }],
    byBrawler: {
      SHELLY: [{ brawlerName: "SHELLY", name: "WITCH SHELLY", source: "brawlace" }],
    },
  };
}

describe("player skin browser cache", () => {
  it("returns a recent owned inventory as stale fallback metadata", () => {
    const storage = new MemoryStorage();
    writePlayerSkinCache(storage, "ABC123", ownedInventory("ABC123"), 1000);

    expect(readPlayerSkinCache(storage, "ABC123", 2000)).toMatchObject({
      coverage: "owned",
      supplementalStatus: "stale",
      supplementalCachedAt: new Date(1000).toISOString(),
    });
  });

  it("removes expired and malformed entries", () => {
    const storage = new MemoryStorage();
    storage.setItem(`${PLAYER_SKIN_CACHE_PREFIX}BAD`, "not-json");
    writePlayerSkinCache(storage, "OLD", ownedInventory("OLD"), 1000);

    prunePlayerSkinCache(storage, 24 * 60 * 60 * 1000 + 2000);

    expect(storage.getItem(`${PLAYER_SKIN_CACHE_PREFIX}BAD`)).toBeNull();
    expect(storage.getItem(`${PLAYER_SKIN_CACHE_PREFIX}OLD`)).toBeNull();
  });

  it("keeps only the newest bounded number of cached tags", () => {
    const storage = new MemoryStorage();

    for (let index = 0; index < PLAYER_SKIN_CACHE_MAX_ENTRIES + 5; index += 1) {
      writePlayerSkinCache(storage, `TAG${index}`, ownedInventory(`TAG${index}`), 1000 + index);
    }

    const cacheKeys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
      (key): key is string => Boolean(key?.startsWith(PLAYER_SKIN_CACHE_PREFIX)),
    );
    expect(cacheKeys).toHaveLength(PLAYER_SKIN_CACHE_MAX_ENTRIES);
    expect(storage.getItem(`${PLAYER_SKIN_CACHE_PREFIX}TAG0`)).toBeNull();
    expect(storage.getItem(`${PLAYER_SKIN_CACHE_PREFIX}TAG24`)).not.toBeNull();
  });
});
