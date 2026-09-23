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

  const key = PLAYER_SKIN_CACHE_PREFIX + tag;
  const value = JSON.stringify({ savedAt: now, inventory } satisfies StoredSkinInventory);

  // Make room before writing. If storage is already full, writing first means
  // we never get a chance to evict stale or old cache entries.
  prunePlayerSkinCache(storage, now, PLAYER_SKIN_CACHE_MAX_ENTRIES - 1);

  try {
    storage.setItem(key, value);
  } catch (error) {
    if (!isQuotaExceededError(error)) throw error;

    evictOldestPlayerSkinCacheEntry(storage, key, now);
    try {
      storage.setItem(key, value);
    } catch (retryError) {
      if (!isQuotaExceededError(retryError)) throw retryError;
      return;
    }
  }

  prunePlayerSkinCache(storage, now);
}

export function prunePlayerSkinCache(
  storage: StorageLike,
  now = Date.now(),
  maxEntries = PLAYER_SKIN_CACHE_MAX_ENTRIES,
) {
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
    .slice(Math.max(0, maxEntries))
    .forEach(({ key }) => storage.removeItem(key));
}

function evictOldestPlayerSkinCacheEntry(
  storage: StorageLike,
  keyToKeep: string,
  now: number,
) {
  const entries: Array<{ key: string; savedAt: number }> = [];

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (!key?.startsWith(PLAYER_SKIN_CACHE_PREFIX) || key === keyToKeep) continue;

    const entry = parseStoredEntry(storage.getItem(key));
    if (!entry || !isUsableEntry(entry, now)) {
      storage.removeItem(key);
      continue;
    }
    entries.push({ key, savedAt: entry.savedAt });
  }

  const oldest = entries.sort((left, right) => left.savedAt - right.savedAt)[0];
  if (oldest) storage.removeItem(oldest.key);
}

function isQuotaExceededError(error: unknown) {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  );
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
