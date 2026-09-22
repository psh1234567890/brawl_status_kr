import type { PlayerData, PlayerSkinInventoryResponse } from "../types/brawl";
import { normalizePlayerTag } from "../utils/playerTag";
import {
  buildOfficialSkinInventory,
  mergeSkinInventories,
} from "../utils/playerSkinInventory";
import { fetchBrawlaceSkinInventory } from "./brawlaceSkins";
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

  const supplemental = await fetchSupplementalSkinInventory(cleanTag).catch((error) => {
    console.warn(
      "Supplemental owned-skin lookup failed; using official equipped skins:",
      getSupplementalErrorLog(error),
    );
    return null;
  });

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
  if (!isSupplementalLookupEnabled()) return null;

  const cleanTag = normalizePlayerTag(tag);
  const fresh = supplementalCache.getFresh(cleanTag);
  if (fresh) return fresh;

  const pending = supplementalPending.get(cleanTag);
  if (pending) return pending;

  const request = (async () => {
    try {
      const result = await fetchBrawlaceSkinInventory(cleanTag);
      supplementalCache.set(cleanTag, result);
      return result;
    } catch (error) {
      const stale = supplementalCache.getStale(cleanTag);
      if (stale) return stale;
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

function getSupplementalErrorLog(error: unknown) {
  if (error instanceof Error) {
    const status = "status" in error && typeof error.status === "number" ? error.status : undefined;
    return { message: error.message, name: error.name, status };
  }
  return { message: String(error) };
}
