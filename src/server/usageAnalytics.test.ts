import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../db", () => ({ db: { $client: { query: vi.fn() } } }));
import { isUsageAdminUser, isUsageKind, isUsageOptedOut, summarizeUsage } from "./usageAnalytics";

describe("anonymous usage analytics", () => {
  afterEach(() => { delete process.env.USAGE_ADMIN_USER_IDS; });
  it("rejects unrecognized client event kinds", () => {
    expect(isUsageKind("visit_session")).toBe(true);
    expect(isUsageKind("minigame_map_quiz")).toBe(true);
    expect(isUsageKind("player_tag:9C82J8YPP")).toBe(false);
    expect(isUsageKind("../../admin")).toBe(false);
  });
  it("counts without visitor identifiers across KST days", () => {
    const summary = summarizeUsage([
      { hour: "2026-10-11 03:00", kind: "visit_session", count: "2" },
      { hour: "2026-10-11 04:00", kind: "player_search_success", count: "3" },
      { hour: "2026-10-11 04:00", kind: "player_search_error", count: "1" },
      { hour: "2026-10-10 23:00", kind: "minigame_map_quiz", count: "4" },
    ], new Date("2026-10-11T00:00:00Z"));
    expect(summary.today).toEqual({ visits: 2, searches: 4, successfulSearches: 3, gameEnds: 0 });
    expect(summary.last7Days.gameEnds).toBe(4);
    expect(summary.byGame.map_quiz).toBe(4);
    expect(summary.daily).toHaveLength(7);
  });
  it("fails closed unless explicit admin IDs match", () => {
    expect(isUsageAdminUser("owner")).toBe(false);
    process.env.USAGE_ADMIN_USER_IDS = "first, owner";
    expect(isUsageAdminUser("owner")).toBe(true);
    expect(isUsageAdminUser("anyone")).toBe(false);
  });
  it("honors a browser opt-out cookie without storing identities", () => {
    expect(isUsageOptedOut(new Request("https://example.com", { headers: { cookie: "other=1; brawl_analytics_opt_out=1" } }))).toBe(true);
    expect(isUsageOptedOut(new Request("https://example.com", { headers: { cookie: "brawl_analytics_opt_out=0" } }))).toBe(false);
  });
});
