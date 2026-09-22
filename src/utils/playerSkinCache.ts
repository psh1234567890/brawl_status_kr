import type { PlayerSkinInventoryResponse } from "../types/brawl";

export const PLAYER_SKIN_CACHE_PREFIX = "skinInventoryCache:v1:";
export const PLAYER_SKIN_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const PLAYER_SKIN_CACHE_MAX_ENTRIES = 20;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

type StoredSkinInventory = {
  savedAt: number;
  inventory: PlayerSkinInventoryResponse;
};

export function readPlayerSkinCache(
  storage: StorageLike,
  tag: string,
  now = Date.now(),
): PlayerSkinInventoryResponse | null {
  const key = `${PLAYER_SKIN_CACHE_PREFIX}${tag}`;
  const entry = parseStoredEntry(storage.getItem(key));
  if (!entry || !isUsableEntry(entry, now)) {
    storage.removeItem(key);
    return null;
  }

  return {
    ...entry.inventory,
    supplementalCachedAt: new Date(entry.savedAt).toISOString(),
    supplementalStatus: "stale",
  };
}

export function writePlayerSkinCache(
  storage: StorageLike,
  tag: string,
  inventory: PlayerSkinInventoryResponse,
  now = Date.now(),
) {
  if (inventory.coverage !== "owned" || inventory.supplementalStatus !== "ready") return;

  storage.setItem(
    `${PLAYER_SKIN_CACHE_PREFIX}${tag}`,
    JSON.stringify({ savedAt: now, inventory } satisfies StoredSkinInventory),
  );
  prunePlayerSkinCache(storage, now);
}

export function prunePlayerSkinCache(storage: StorageLike, now = Date.now()) {
  const entries: Array<{ key: string; savedAt: number }> = [];

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (!key?.startsWith(PLAYER_SKIN_CACHE_PREFIX)) continue;

    const entry = parseStoredEntry(storage.getItem(key));
    if (!entry || !isUsableEntry(entry, now)) {
      storage.removeItem(key);
      continue;
    }
    entries.push({ key, savedAt: entry.savedAt });
  }

  entries
    .sort((left, right) => right.savedAt - left.savedAt)
    .slice(PLAYER_SKIN_CACHE_MAX_ENTRIES)
    .forEach(({ key }) => storage.removeItem(key));
}

function parseStoredEntry(raw: string | null): StoredSkinInventory | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSkinInventory>;
    if (typeof parsed.savedAt !== "number" || !parsed.inventory) return null;
    return {
      savedAt: parsed.savedAt,
      inventory: parsed.inventory,
    };
  } catch {
    return null;
  }
}

function isUsableEntry(entry: StoredSkinInventory, now: number) {
  return (
    entry.inventory.coverage === "owned" &&
    now - entry.savedAt >= 0 &&
    now - entry.savedAt <= PLAYER_SKIN_CACHE_MAX_AGE_MS
  );
}
