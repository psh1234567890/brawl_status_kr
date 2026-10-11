import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ execute: vi.fn(), cache: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../db", () => ({ db: { execute: mocks.execute } }));
vi.mock("next/cache", () => ({ unstable_cache: mocks.cache }));
import { PgDialect } from "drizzle-orm/pg-core";

describe("public collection snapshot", () => {
  it("queries only the private snapshot, rather than scanning battle logs", async () => {
    const { buildCachedDataStatusQuery } = await import("./dataStatus");
    const { sql } = new PgDialect().sqlToQuery(buildCachedDataStatusQuery());
    expect(sql).toContain("analytics_private.collection_status_snapshot");
    expect(sql).toContain("refreshed_at");
    expect(sql).not.toContain("FROM battle_logs");
  });
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    mocks.cache.mockImplementation((run) => run);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("shares concurrent reads across locales and caches only the public snapshot", async () => {
    let resolve!: (value: unknown) => void;
    mocks.execute.mockReturnValue(new Promise((done) => { resolve = done; }));
    const { getDataStatus } = await import("./dataStatus");
    const korean = getDataStatus();
    const english = getDataStatus();
    const summary = { totalBattles: "12", uniqueBattles: "8", popularMaps: [], popularBrawlers: [] };
    resolve({ rows: [summary] });
    const [a, b] = await Promise.all([korean, english]);
    expect(a?.summary).toEqual(summary);
    expect(b).toEqual(a);
    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(mocks.cache).toHaveBeenCalledWith(expect.any(Function), ["public-data-status-v4-precomputed"], { revalidate: 900 });
  });

  it("does not fabricate zero counts or cache failure, and permits a later recovery", async () => {
    mocks.execute.mockRejectedValueOnce(new Error("private DB error"));
    const { getDataStatus } = await import("./dataStatus");
    expect(await getDataStatus()).toBeNull();
    mocks.execute.mockResolvedValueOnce({ rows: [{ totalBattles: "12" }] });
    expect((await getDataStatus())?.summary.totalBattles).toBe("12");
    expect(String(vi.mocked(console.error).mock.calls)).not.toContain("private DB error");
    // The function passed to Next's cache throws on failure; the UI fallback is outside it.
    mocks.execute.mockRejectedValueOnce(new Error("offline"));
    await expect(mocks.cache.mock.calls[0][0]()).rejects.toThrow("Data status query unavailable");
  });

  it("serves the last successful snapshot when a refresh fails and throttles immediate retries", async () => {
    const summary = { totalBattles: "12", popularMaps: [], popularBrawlers: [] };
    mocks.execute.mockResolvedValueOnce({ rows: [summary] });
    mocks.execute.mockRejectedValueOnce(new Error("DB temporarily unavailable"));
    const { getDataStatus } = await import("./dataStatus");
    const first = await getDataStatus();
    const fallback = await getDataStatus();
    expect(fallback).toEqual(first);
    expect(await getDataStatus()).toEqual(first);
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });

  it("sanitizes a shared database failure for every concurrent cache refresh", async () => {
    let reject!: (error: Error) => void;
    mocks.execute.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
    await import("./dataStatus");
    const refresh = mocks.cache.mock.calls[0][0];
    const results = Promise.allSettled([refresh(), refresh()]);
    reject(new Error("private connection details"));
    for (const result of await results) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") expect(result.reason.message).toBe("Data status query unavailable");
    }
    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(String(vi.mocked(console.error).mock.calls)).not.toContain("private connection details");
  });
});
