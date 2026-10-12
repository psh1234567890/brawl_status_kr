import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("./minigames", () => ({ isMinigameFixtureMode: () => true }));
vi.mock("./brawlify", () => ({ getBrawlifyBrawlers: vi.fn() }));
import { projectHealthEntries, projectReleaseEntries, loadComparisonEntries } from "./comparisonGames";

const catalog = [
  { id: 16000000, name: "Shelly", released: true, imageUrl: "https://cdn.brawlify.com/x.png" },
  { id: 16000001, name: "Colt", released: true },
  { id: 16000002, name: "Bibi", released: false },
  { id: 16000003, name: "Never Existed", released: true },
];
describe("source-backed comparison projections", () => {
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
