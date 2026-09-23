import type { PlayerData, PlayerSkinInventoryResponse } from "../types/brawl";
import { normalizePlayerTag } from "../utils/playerTag";
import {
  buildOfficialSkinInventory,
  mergeSkinInventories,
} from "../utils/playerSkinInventory";
import { fetchBrawlaceSkinInventory } from "./brawlaceSkins";
import { logSkinSupplementalOutcome } from "./observability";
import { createSkinInventoryCache } from "./skinInventoryCache";
import { fetchBrawlApi } from "./upstream";

const supplementalCache = createSkinInventoryCache({
  freshMs: 6 * 60 * 60 * 1000,
  staleMs: 24 * 60 * 60 * 1000,
});
const supplementalPending = new Map<string, Promise<PlayerSkinInventoryResponse>>();

export async function fetchPlayerSkinInventory(
  tag: string,
): Promise<PlayerSkinInventoryResponse> {
  const cleanTag = normalizePlayerTag(tag);
  const player = await fetchBrawlApi<PlayerData>(`/players/%23${cleanTag}`, 30_000);
  const official = buildOfficialSkinInventory(player, cleanTag);

  const supplemental = await fetchSupplementalSkinInventory(cleanTag).catch(() => null);

  return supplemental
    ? mergeSkinInventories(official, supplemental)
    : {
        ...official,
        supplementalStatus: isSupplementalLookupEnabled() ? "unavailable" : "disabled",
      };
}

export async function fetchSupplementalSkinInventory(
  tag: string,
): Promise<PlayerSkinInventoryResponse | null> {
  if (!isSupplementalLookupEnabled()) {
    logSkinSupplementalOutcome("disabled");
    return null;
  }

  const cleanTag = normalizePlayerTag(tag);
  const fresh = supplementalCache.getFresh(cleanTag);
  if (fresh) {
    logSkinSupplementalOutcome("fresh_cache");
    return fresh;
  }

  const pending = supplementalPending.get(cleanTag);
  if (pending) {
    logSkinSupplementalOutcome("shared_request");
    return pending;
  }

  const request = (async () => {
    const startedAt = performance.now();
    try {
      const result = await fetchBrawlaceSkinInventory(cleanTag);
      supplementalCache.set(cleanTag, result);
      logSkinSupplementalOutcome("provider_ready", {
        durationMs: performance.now() - startedAt,
      });
      return result;
    } catch (error) {
      const stale = supplementalCache.getStale(cleanTag);
      if (stale) {
        logSkinSupplementalOutcome("stale_cache", {
          durationMs: performance.now() - startedAt,
          error,
        });
        return stale;
      }
      logSkinSupplementalOutcome("unavailable", {
        durationMs: performance.now() - startedAt,
        error,
      });
      throw error;
    }
  })();

  supplementalPending.set(cleanTag, request);
  try {
    return await request;
  } finally {
    supplementalPending.delete(cleanTag);
  }
}

function isSupplementalLookupEnabled() {
  return process.env.BRAWLACE_SKIN_LOOKUP_ENABLED?.trim().toLowerCase() === "true";
}
