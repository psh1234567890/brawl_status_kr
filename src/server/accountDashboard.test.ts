import { describe, expect, it, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ query: vi.fn(), snapshot: vi.fn() }));
vi.mock("../db", () => ({ db: { $client: { query: mocks.query } } }));
vi.mock("./upstream", () => ({ fetchBrawlApiSnapshot: mocks.snapshot }));
import { readDashboardPlayer, readMyRankings } from "./accountDashboard";

describe("account dashboard private data", () => {
  beforeEach(() => { vi.resetAllMocks(); });
  it("uses saved tag, never writes search statistics or personal identity in SQL", async () => {
    mocks.snapshot.mockResolvedValue({ data: {
      tag: "#2PY", name: "Preview", trophies: 1234, highestTrophies: 1600,
      "3vs3Victories": 44, brawlers: [{ name: "Shelly" }], icon: { id: 28000000 },
    } });
    expect(await readDashboardPlayer("#2py")).toEqual({
      tag: "2PY", name: "Preview", trophies: 1234, highestTrophies: 1600,
      victories3v3: 44, brawlerCount: 1, iconId: 28000000,
    });
    expect(mocks.snapshot.mock.calls[0][0]).toBe("/players/%232PY");
    expect(mocks.query).not.toHaveBeenCalled();
    expect(await readDashboardPlayer("invalid!")).toBeNull();
    expect(mocks.snapshot).toHaveBeenCalledTimes(1);
  });
  it("returns six self-only rank records from server-verified competition tables", async () => {
    mocks.query.mockResolvedValue({ rows: [{ rank: "3", score: 9 }] });
    const rows = await readMyRankings("own-account-uuid");
    expect(rows).toHaveLength(6);
    expect(rows).toContainEqual({ gameId: "higher-lower", period: "today", rank: 3, score: 9 });
    expect(rows).toContainEqual({ gameId: "release-order", period: "all", rank: 3, score: 9 });
    for (const [sql, args] of mocks.query.mock.calls) {
      expect(args[1]).toBe("own-account-uuid");
      expect(args[0]).toMatch(/^(higher-lower|release-order)$/);
      expect(sql).toContain("WHERE user_id = $2");
      expect(sql).toContain("public.competitive_results");
      expect(sql).toContain("public.competitive_aliases");
      expect(sql).not.toContain("minigame_personal_bests");
      expect(sql).toContain("ROW_NUMBER()");
    }
  });
  it("represents missing competitive results as unranked rather than inventing a position", async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    expect(await readMyRankings("own-account-uuid")).toHaveLength(6);
    expect((await readMyRankings("own-account-uuid")).every(row => row.rank === null && row.score === null)).toBe(true);
  });
});
