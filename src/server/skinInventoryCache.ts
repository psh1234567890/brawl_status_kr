import type { PlayerSkinInventoryResponse } from "../types/brawl";

type Entry = {
  fetchedAt: number;
  value: PlayerSkinInventoryResponse;
};

export function createSkinInventoryCache({
  freshMs,
  staleMs,
  maxEntries = 500,
}: {
  freshMs: number;
  staleMs: number;
  maxEntries?: number;
}) {
  const entries = new Map<string, Entry>();

  function getFresh(tag: string, now = Date.now()) {
    const entry = entries.get(tag);
    if (!entry || now - entry.fetchedAt > freshMs) return null;
    return withCacheMetadata(entry, "ready");
  }

  function getStale(tag: string, now = Date.now()) {
    const entry = entries.get(tag);
    if (!entry) return null;
    if (now - entry.fetchedAt > staleMs) {
      entries.delete(tag);
      return null;
    }
    return withCacheMetadata(entry, "stale");
  }

  function set(tag: string, value: PlayerSkinInventoryResponse, now = Date.now()) {
    entries.delete(tag);
    entries.set(tag, { fetchedAt: now, value });
    prune(now);
  }

  function prune(now = Date.now()) {
    for (const [key, entry] of entries) {
      if (now - entry.fetchedAt > staleMs) entries.delete(key);
    }
    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value as string | undefined;
      if (!oldestKey) break;
      entries.delete(oldestKey);
    }
  }

  return { getFresh, getStale, set };
}

function withCacheMetadata(
  entry: Entry,
  status: "ready" | "stale",
): PlayerSkinInventoryResponse {
  return {
    ...entry.value,
    supplementalCachedAt: new Date(entry.fetchedAt).toISOString(),
    supplementalStatus: status,
  };
}
