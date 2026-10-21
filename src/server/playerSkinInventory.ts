import type { PlayerData, PlayerSkinInventoryResponse } from "../types/brawl";
import { normalizePlayerTag } from "../utils/playerTag";
import {
  buildOfficialSkinInventory,
  mergeSkinInventories,
} from "../utils/playerSkinInventory";
import { fetchBrawlaceSkinInventory } from "./brawlaceSkins";
import { logSkinSupplementalOutcome } from "./observability";
import { createSkinInventoryCache } from "./skinInventoryCache";
import { fetchBrawlApiSnapshot } from "./upstream";

const supplementalCache = createSkinInventoryCache({
  freshMs: 6 * 60 * 60 * 1000,
  staleMs: 24 * 60 * 60 * 1000,
});
const supplementalPending = new Map<string, Promise<PlayerSkinInventoryResponse>>();
const supplementalBackoff = new Map<string, number>();
const SUPPLEMENTAL_FAILURE_COOLDOWN_MS = 5 * 60_000;

export async function fetchPlayerSkinInventory(
  tag: string,
): Promise<PlayerSkinInventoryResponse> {
  const cleanTag = normalizePlayerTag(tag);
  // The official equipped-skin baseline can survive a brief provider outage,
  // using the same bounded profile snapshot used by player search.
  const player = await fetchBrawlApiSnapshot<PlayerData>(
    `/players/%23${cleanTag}`, 30_000, 5 * 60_000,
  );
  const official = buildOfficialSkinInventory(player.data, cleanTag);

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
  // A failing optional third-party provider must not be hammered for each tap
  // (or for each cold session). Preserve stale known-good skin results first.
  if ((supplementalBackoff.get(cleanTag) ?? 0) > Date.now()) {
    const stale = supplementalCache.getStale(cleanTag);
    if (stale) return stale;
    return Promise.reject(new Error("Supplemental skin lookup temporarily unavailable"));
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
      supplementalBackoff.delete(cleanTag);
      supplementalCache.set(cleanTag, result);
      logSkinSupplementalOutcome("provider_ready", {
        durationMs: performance.now() - startedAt,
      });
      return result;
    } catch (error) {
      supplementalBackoff.set(cleanTag, Date.now() + SUPPLEMENTAL_FAILURE_COOLDOWN_MS);
      if (supplementalBackoff.size > 500) {
        for (const [key, retryAt] of supplementalBackoff) {
          if (retryAt <= Date.now()) supplementalBackoff.delete(key);
        }
        while (supplementalBackoff.size > 500) {
          const oldest = supplementalBackoff.keys().next().value;
          if (!oldest) break;
          supplementalBackoff.delete(oldest);
        }
      }
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
