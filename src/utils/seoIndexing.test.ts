import { describe, expect, it } from "vitest";
import type {
  BrawlifyBrawler,
  BrawlifyGameMode,
  BrawlifyMap,
} from "../types/brawlify";
import {
  INDEXABLE_MAP_LIMIT,
  isIndexableMap,
  selectBrowsableMaps,
  selectIndexableBrawlers,
  selectIndexableGameModes,
  selectIndexableMaps,
} from "./seoIndexing";

describe("SEO indexing catalog", () => {
  it("keeps only released brawlers and enabled game modes", () => {
    const brawlers = [
      { id: 1, name: "Released", released: true },
      { id: 2, name: "Upcoming", released: false },
      { id: 1, name: "Duplicate", released: true },
    ] satisfies BrawlifyBrawler[];
    const modes = [
      { id: 10, name: "Active", disabled: false },
      { id: 11, name: "Archived", disabled: true },
    ] satisfies BrawlifyGameMode[];

    expect(selectIndexableBrawlers(brawlers).map((item) => item.id)).toEqual([1]);
    expect(selectIndexableGameModes(modes).map((item) => item.id)).toEqual([10]);
  });

  it("limits maps to the most recently active enabled unique IDs", () => {
    const maps: BrawlifyMap[] = Array.from({ length: INDEXABLE_MAP_LIMIT + 5 }, (_, index) => ({
      id: 15_000_000 + index,
      name: "Map " + index,
      disabled: false,
      lastActive: 1_700_000_000 + index,
    }));
    maps.push({ id: 99_999_999, name: "Disabled", disabled: true });
    maps.push({ ...maps[0] });

    const selected = selectIndexableMaps(maps);

    expect(selected).toHaveLength(INDEXABLE_MAP_LIMIT);
    expect(selected[0].id).toBe(15_000_084);
    expect(selected.at(-1)?.id).toBe(15_000_005);
    expect(isIndexableMap(maps[0], maps)).toBe(false);
    expect(isIndexableMap(maps[5], maps)).toBe(true);
  });

  it("prefers recent map activity over a larger map id for browsing", () => {
    const maps = [
      { id: 99, name: "Older high id", disabled: false, lastActive: 100 },
      { id: 10, name: "Recent low id", disabled: false, lastActive: 200 },
      { id: 11, name: "Disabled", disabled: true, lastActive: 300 },
    ] satisfies BrawlifyMap[];

    expect(selectBrowsableMaps(maps).map((item) => item.id)).toEqual([10, 99]);
  });
});
