import type {
  BrawlifyBrawler,
  BrawlifyGameMode,
  BrawlifyMap,
} from "../types/brawlify";

export const INDEXABLE_MAP_LIMIT = 80;

export function selectIndexableBrawlers(items: BrawlifyBrawler[]) {
  return uniqueById(items.filter((item) => item.released !== false));
}

export function selectIndexableGameModes(items: BrawlifyGameMode[]) {
  return uniqueById(items.filter((item) => !item.disabled));
}

export function selectIndexableMaps(items: BrawlifyMap[]) {
  return uniqueById(items.filter((item) => !item.disabled))
    .sort(compareIdDescending)
    .slice(0, INDEXABLE_MAP_LIMIT);
}

export function isIndexableMap(map: BrawlifyMap, allMaps: BrawlifyMap[]) {
  return selectIndexableMaps(allMaps).some((item) => item.id === map.id);
}

function uniqueById<T extends { id: number | string }>(items: T[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const id = String(item.id);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function compareIdDescending(
  left: { id: number | string },
  right: { id: number | string },
) {
  const leftNumber = Number(left.id);
  const rightNumber = Number(right.id);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return rightNumber - leftNumber;
  }

  return String(right.id).localeCompare(String(left.id));
}
