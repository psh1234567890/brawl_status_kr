import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("./minigames", () => ({ isMinigameFixtureMode: () => true }));
vi.mock("./brawlify", () => ({ getBrawlifyBrawlers: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
import { compactHeroHealth, projectHealthEntries, projectReleaseEntries, loadComparisonEntries } from "./comparisonGames";

const catalog = [
  { id: 16000000, name: "Shelly", released: true, imageUrl: "https://cdn.brawlify.com/x.png" },
  { id: 16000001, name: "Colt", released: true },
  { id: 16000002, name: "Bibi", released: false },
  { id: 16000003, name: "Never Existed", released: true },
];
describe("source-backed comparison projections", () => {
  it("caches only validated active Hero HP, never the full 2MB upstream payload", () => {
    const compact = compactHeroHealth({
      shelly: { id: 16000000, Type: "Hero", Hitpoints: 3900, Disabled: false, Unneeded: "x".repeat(3000) },
      disabled: { id: 16000001, Type: "Hero", Hitpoints: 4200, Disabled: true },
      pet: { id: 16000002, Type: "Pet", Hitpoints: 3000, Disabled: false },
      invalid: { id: "oops", Type: "Hero", Hitpoints: 999, Disabled: false },
    });
    expect(compact).toEqual({
      "16000000": { id: 16000000, Type: "Hero", Hitpoints: 3900, Disabled: false },
    });
    expect(JSON.stringify(compact).length).toBeLessThan(150);
    expect(compactHeroHealth(null)).toEqual({});
  });
  it("uses game-file HP only for active Hero records", () => {
    const rows = {
      a: { id: 16000000, Type: "Hero", Hitpoints: 3900, Disabled: false },
      b: { id: 16000001, Type: "Pet", Hitpoints: 100000, Disabled: false },
      c: { id: 16000002, Type: "Hero", Hitpoints: 4200, Disabled: false },
    };
    expect(projectHealthEntries(catalog, rows, "en")).toMatchObject([{ id: 16000000, value: 3900 }]);
  });
  it("uses only documented dates, no brawler-id inference", () => {
    const items = projectReleaseEntries(catalog, "en");
    expect(items.some(x => x.id === 16000000)).toBe(false);
    expect(items.some(x => x.id === 16000003)).toBe(false);
    expect(items.some(x => x.id === 16000002)).toBe(false);
  });
  it("uses isolated fixtures for E2E", async () => {
    expect(await loadComparisonEntries("release-order", "ko")).toHaveLength(30);
    expect(await loadComparisonEntries("higher-lower", "ko")).toHaveLength(30);
  });
});
