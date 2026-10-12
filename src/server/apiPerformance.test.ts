import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  after: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("../db", () => ({ db: { $client: { query: mocks.query } } }));
import {
  isMeasuredRoute, latencyBucket, readApiPerformanceHours,
  scheduleApiPerformance, statusBucket,
} from "./apiPerformance";

describe("anonymous hourly API performance counters", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "production");
    mocks.after.mockReset();
    mocks.query.mockReset().mockResolvedValue({ rows: [] });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("accepts only a fixed route allowlist and deterministic histogram groups", () => {
    expect(isMeasuredRoute("api.player")).toBe(true);
    expect(isMeasuredRoute("api.player?tag=SECRET")).toBe(false);
    expect(latencyBucket(250)).toBe("le_250ms");
    expect(latencyBucket(251)).toBe("le_500ms");
    expect(latencyBucket(10_001)).toBe("over_10000ms");
    expect(statusBucket(404)).toBe("not_found_count");
    expect(statusBucket(429)).toBe("rate_limited_count");
    expect(statusBucket(502)).toBe("server_error_count");
    expect(statusBucket(204)).toBe("ok_count");
  });

  it("writes only static route key and bounded duration after the response", async () => {
    const request = new Request("https://example.test/api/player?tag=PRIVATE_TAG", {
      headers: { cookie: "session=SUPER_SECRET", "x-forwarded-for": "203.0.113.3" },
    });
    scheduleApiPerformance(request, "api.player", 503, 730.4);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.after).toHaveBeenCalledOnce();
    await mocks.after.mock.calls[0][0]();
    expect(mocks.query).toHaveBeenCalledOnce();
    const [sql, params] = mocks.query.mock.calls[0];
    expect(sql).toContain("ON CONFLICT");
    expect(sql).toContain("server_error_count");
    expect(sql).toContain("le_1000ms");
    expect(params).toEqual(["api.player", 730.4]);
    expect(JSON.stringify([sql, params])).not.toMatch(/PRIVATE_TAG|SUPER_SECRET|203\.0\.113\.3|request_id|account_id|ip_address|player_tag/i);
  });

  it("skips preview, opted-out traffic, and unknown endpoints", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    scheduleApiPerformance(new Request("https://example.test"), "api.player", 200, 20);
    vi.stubEnv("VERCEL_ENV", "production");
    scheduleApiPerformance(
      new Request("https://example.test", { headers: { cookie: "brawl_analytics_opt_out=1" } }),
      "api.player", 200, 20,
    );
    scheduleApiPerformance(new Request("https://example.test"), "api.health", 200, 20);
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("queries only aggregated 24-hour / 7-day counters", async () => {
    await readApiPerformanceHours(24);
    const [sql, params] = mocks.query.mock.calls[0];
    expect(params).toEqual([24]);
    expect(sql).toContain("SUM(request_count)");
    expect(sql).toContain("GROUP BY route_key");
    expect(JSON.stringify(mocks.query.mock.calls[0])).not.toMatch(/request_id|account_id|ip_address|player_tag|user_agent/i);
    await readApiPerformanceHours(168);
    expect(mocks.query.mock.calls[1][1]).toEqual([168]);
  });

  it("does not fail player search when an aggregate database write fails", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.query.mockRejectedValueOnce(new Error("secret DB connection detail"));
    scheduleApiPerformance(new Request("https://example.test"), "api.player", 200, 41);
    await expect(mocks.after.mock.calls[0][0]()).resolves.toBeUndefined();
    expect(JSON.stringify(spy.mock.calls)).not.toContain("secret DB connection detail");
    spy.mockRestore();
  });
});
