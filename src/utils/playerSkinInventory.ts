import type {
  PlayerData,
  PlayerOwnedSkin,
  PlayerSkinInventoryResponse,
} from "../types/brawl";

export function normalizeSkinLookupKey(value: string) {
  return decodeHtmlEntities(value)
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "");
}

export function groupSkinsByBrawler(skins: PlayerOwnedSkin[]) {
  const result: Record<string, PlayerOwnedSkin[]> = {};
  for (const skin of skins) {
    const key = normalizeSkinLookupKey(skin.brawlerName);
    result[key] ??= [];
    result[key].push(skin);
  }
  return result;
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
    const key = `${normalizeSkinLookupKey(skin.brawlerName)}:${normalizeSkinLookupKey(skin.name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    skins.push(skin);
  }

  return {
    byBrawler: groupSkinsByBrawler(skins),
    coverage: "owned",
    skins,
    source: "mixed",
    supplementalCachedAt: supplemental.supplementalCachedAt,
    supplementalStatus: supplemental.supplementalStatus,
    tag: official.tag,
  };
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
