import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const query = vi.hoisted(() => vi.fn());
vi.mock("../db", () => ({ db: { $client: { query } } }));
import { classifyPlayerSearchFailure, hasUsageAdminAccess, isUsageAdminUser, isUsageKind, isUsageOptedOut, readUsageLifetime, summarizeLifetime, summarizeUsage } from "./usageAnalytics";

describe("anonymous usage analytics", () => {
  afterEach(() => { delete process.env.USAGE_ADMIN_USER_IDS; query.mockReset(); });
  it("rejects unrecognized client event kinds", () => {
    expect(isUsageKind("visit_session")).toBe(true);
    expect(isUsageKind("minigame_map_quiz")).toBe(true);
    expect(isUsageKind("player_tag:9C82J8YPP")).toBe(false);
    expect(isUsageKind("../../admin")).toBe(false);
  });
  it("classifies profile errors without storing raw tags or visitor identifiers", () => {
    expect(classifyPlayerSearchFailure(404)).toBe("player_search_error_404");
    expect(classifyPlayerSearchFailure(429)).toBe("player_search_error_429");
    expect(classifyPlayerSearchFailure(503)).toBe("player_search_error_5xx");
    expect(classifyPlayerSearchFailure(520)).toBe("player_search_error_5xx");
    expect(classifyPlayerSearchFailure(403)).toBe("player_search_error_other");
  });
  it("preserves search totals without double-counting the new reason counters", () => {
    const hourly = summarizeUsage([
      { hour: "2026-10-12 08:00", kind: "player_search_success", count: "8" },
      { hour: "2026-10-12 08:00", kind: "player_search_error", count: "4" },
      { hour: "2026-10-12 08:00", kind: "player_search_error_404", count: "2" },
      { hour: "2026-10-12 08:00", kind: "player_search_error_5xx", count: "1" },
    ], new Date("2026-10-12T00:30:00Z"));
    expect(hourly.today.searches).toBe(12);
    expect(hourly.today.successfulSearches).toBe(8);
    expect(hourly.failureReasonsToday.player_search_error_404).toBe(2);
    expect(hourly.failureReasonsLast7Days.player_search_error_5xx).toBe(1);
    const lifetime = summarizeLifetime([
      { kind: "player_search_error", count: "4", firstSeenAt: "2026-10-12T00:00:00Z" },
      { kind: "player_search_error_404", count: "2", firstSeenAt: "2026-10-12T00:00:00Z" },
    ]);
    expect(lifetime.allTime.searches).toBe(4);
    expect(lifetime.failureReasonsAllTime.player_search_error_404).toBe(2);
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
    expect(summary.byGameToday.map_quiz).toBeUndefined();
    expect(summary.daily).toHaveLength(7);
  });
  it("preserves cumulative counts independently of expired hourly records", () => {
    const lifetime = summarizeLifetime([
      { kind: "visit_session", count: "85", firstSeenAt: "2026-07-01T02:00:00Z" },
      { kind: "player_search_success", count: "31", firstSeenAt: "2026-07-03T00:00:00Z" },
      { kind: "player_search_error", count: "4", firstSeenAt: "2026-07-03T00:00:00Z" },
      { kind: "minigame_map_quiz", count: "12", firstSeenAt: "2026-08-01T00:00:00Z" },
      { kind: "minigame_brawler_quiz", count: "3", firstSeenAt: "2026-08-01T00:00:00Z" },
    ]);
    expect(lifetime.allTime).toEqual({
      visits: 85, searches: 35, successfulSearches: 31, gameEnds: 15,
    });
    expect(lifetime.byGameAllTime).toEqual({ map_quiz: 12, brawler_quiz: 3 });
    expect(lifetime.trackingStartedAt).toBe("2026-07-01T02:00:00Z");
    expect(summarizeLifetime([])).toEqual({
      allTime: { visits: 0, searches: 0, successfulSearches: 0, gameEnds: 0 },
      byGameAllTime: {}, failureReasonsAllTime: {
        player_search_error_404: 0, player_search_error_429: 0,
        player_search_error_5xx: 0, player_search_error_other: 0,
      }, trackingStartedAt: null,
    });
  });
  it("reads protected lifetime totals without individual visitor identifiers", async () => {
    query.mockResolvedValue({ rows: [{ kind: "visit_session", count: "12", firstSeenAt: "2026-10-11T00:00:00Z" }] });
    expect((await readUsageLifetime())[0].count).toBe("12");
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain("analytics_private.usage_lifetime");
    expect(sql).not.toMatch(/player_tag|user_id|visitor_ip/i);
  });
  it("fails closed unless explicit admin IDs match", () => {
    expect(isUsageAdminUser("owner")).toBe(false);
    process.env.USAGE_ADMIN_USER_IDS = "first, owner";
    expect(isUsageAdminUser("owner")).toBe(true);
    expect(isUsageAdminUser("anyone")).toBe(false);
  });
  it("denies unlisted IDs even with an authenticated session", async () => {
    query.mockResolvedValue({ rows: [{ allowed: false }] });
    expect(await hasUsageAdminAccess("11111111-1111-4111-8111-111111111111")).toBe(false);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("analytics_private.usage_admin_allowlist"),
      ["11111111-1111-4111-8111-111111111111"],
    );
  });
  it("grants access only after an exact private DB UUID match", async () => {
    query.mockResolvedValue({ rows: [{ allowed: true }] });
    expect(await hasUsageAdminAccess("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(await hasUsageAdminAccess("invalid-player-tag")).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("preserves explicit legacy environment access without querying DB", async () => {
    process.env.USAGE_ADMIN_USER_IDS = "11111111-1111-4111-8111-111111111111";
    expect(await hasUsageAdminAccess("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(query).not.toHaveBeenCalled();
  });
  it("honors a browser opt-out cookie without storing identities", () => {
    expect(isUsageOptedOut(new Request("https://example.com", { headers: { cookie: "other=1; brawl_analytics_opt_out=1" } }))).toBe(true);
    expect(isUsageOptedOut(new Request("https://example.com", { headers: { cookie: "brawl_analytics_opt_out=0" } }))).toBe(false);
  });
});
