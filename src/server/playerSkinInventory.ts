import type {
  PlayerData,
  PlayerOwnedSkin,
  PlayerSkinInventoryResponse,
} from "../types/brawl";
import { normalizePlayerTag } from "../utils/playerTag";
import {
  fetchBrawlaceSkinInventory,
  groupSkinsByBrawler,
  normalizeLookupKey,
} from "./brawlaceSkins";
import { fetchBrawlApi } from "./upstream";

export async function fetchPlayerSkinInventory(
  tag: string,
): Promise<PlayerSkinInventoryResponse> {
  const cleanTag = normalizePlayerTag(tag);
  const player = await fetchBrawlApi<PlayerData>(`/players/%23${cleanTag}`, 30_000);
  const official = buildOfficialSkinInventory(player, cleanTag);

  if (!isSupplementalLookupEnabled()) return official;

  try {
    const supplemental = await fetchBrawlaceSkinInventory(cleanTag);
    return mergeSkinInventories(official, supplemental);
  } catch (error) {
    console.warn("Supplemental owned-skin lookup failed; using official equipped skins:",
      getSupplementalErrorLog(error),
    );
    return {
      ...official,
      supplementalStatus: "unavailable",
    };
  }
}

export function buildOfficialSkinInventory(
  player: Pick<PlayerData, "brawlers">,
  cleanTag: string,
): PlayerSkinInventoryResponse {
  const skins: PlayerOwnedSkin[] = player.brawlers.map((brawler) => ({
    brawlerName: brawler.name,
    ...(brawler.skin ? { id: brawler.skin.id } : {}),
    name: brawler.skin?.name ?? brawler.name,
    source: "official",
  }));

  return {
    byBrawler: groupSkinsByBrawler(skins),
    coverage: "equipped",
    skins,
    source: "official",
    supplementalStatus: "disabled",
    tag: cleanTag,
  };
}

export function mergeSkinInventories(
  official: PlayerSkinInventoryResponse,
  supplemental: PlayerSkinInventoryResponse,
): PlayerSkinInventoryResponse {
  const skins: PlayerOwnedSkin[] = [];
  const seen = new Set<string>();

  for (const skin of [...official.skins, ...supplemental.skins]) {
    const key = `${normalizeLookupKey(skin.brawlerName)}:${normalizeLookupKey(skin.name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    skins.push(skin);
  }

  return {
    byBrawler: groupSkinsByBrawler(skins),
    coverage: "owned",
    skins,
    source: "mixed",
    supplementalStatus: "ready",
    tag: official.tag,
  };
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
