import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ execute: vi.fn(), cache: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../db", () => ({ db: { execute: mocks.execute } }));
vi.mock("next/cache", () => ({ unstable_cache: mocks.cache }));

describe("public collection snapshot", () => {
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
    expect(mocks.cache).toHaveBeenCalledWith(expect.any(Function), ["public-data-status-v1"], { revalidate: 300 });
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
