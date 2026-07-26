import { describe, expect, it } from "vitest";
import type {
  BrawlifyBrawler,
  BrawlifyGameMode,
  BrawlifyMap,
} from "../types/brawlify";
import {
  INDEXABLE_MAP_LIMIT,
  isIndexableMap,
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

  it("limits maps to the newest enabled unique IDs", () => {
    const maps = Array.from({ length: INDEXABLE_MAP_LIMIT + 5 }, (_, index) => ({
      id: 15_000_000 + index,
      name: `Map ${index}`,
      disabled: false,
    })) satisfies BrawlifyMap[];
    maps.push({ id: 99_999_999, name: "Disabled", disabled: true });
    maps.push({ ...maps[0] });

    const selected = selectIndexableMaps(maps);

    expect(selected).toHaveLength(INDEXABLE_MAP_LIMIT);
    expect(selected[0].id).toBe(15_000_084);
    expect(selected.at(-1)?.id).toBe(15_000_005);
    expect(isIndexableMap(maps[0], maps)).toBe(false);
    expect(isIndexableMap(maps[5], maps)).toBe(true);
  });
});
