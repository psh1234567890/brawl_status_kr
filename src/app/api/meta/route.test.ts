import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), invalidate: vi.fn(), cached: undefined as unknown }));
vi.mock("next/cache", () => ({
  unstable_cache: (read: () => Promise<unknown>) => async () => {
    if (mocks.cached === undefined) mocks.cached = await read();
    return mocks.cached;
  },
  revalidateTag: (...args: unknown[]) => {
    mocks.invalidate(...args);
    mocks.cached = undefined;
  },
}));
vi.mock("../../../db", () => ({ db: { execute: vi.fn() } }));
vi.mock("../../../server/metaStats", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../../server/metaStats")>(),
  queryMapMetaStats: mocks.query,
}));
vi.mock("../../../server/rateLimit", () => ({ rejectRateLimitedRequest: () => null }));
vi.mock("../../../server/sharedPublicRateLimit", () => ({ rejectSharedPublicRateLimit: async () => null }));
vi.mock("../../../server/observability", () => ({
  withApiMonitoring: (_: string, handler: unknown) => handler,
  observeServerOperation: (_: string, read: () => Promise<unknown>) => read(),
}));
import { MetaSnapshotUnavailableError } from "../../../server/metaStats";
import { GET } from "./route";

describe("meta snapshot availability", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.cached = undefined;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns a retryable failure for overdue snapshots", async () => {
    mocks.query.mockRejectedValue(new MetaSnapshotUnavailableError());
    const response = await GET(new Request("https://example.test/api/meta"));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).toBe("60");
    expect(await response.json()).toMatchObject({ code: "META_SNAPSHOT_UNAVAILABLE" });
  });

  it("retains a successful empty result for genuinely insufficient data", async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    const response = await GET(new Request("https://example.test/api/meta"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("still rejects overdue data after refreshing an expired cache", async () => {
    mocks.query.mockResolvedValue({ rows: [{
      mode: "gemGrab", map: "Hard Rock Mine", brawlerName: "SHELLY",
      brawlerId: 1, plays: "10", wins: "6", draws: "0",
      refreshedAt: new Date().toISOString(),
    }] });
    const request = new Request("https://example.test/api/meta");
    expect((await GET(request)).status).toBe(200);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 46 * 60_000);
    expect((await GET(request)).status).toBe(503);
    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(mocks.invalidate).toHaveBeenCalledWith("meta-stats", { expire: 0 });
  });

  it("serves the fresh DB snapshot on the first request after a quiet period", async () => {
    const row = {
      mode: "gemGrab", map: "Hard Rock Mine", brawlerName: "SHELLY",
      brawlerId: 1, plays: "10", wins: "6", draws: "0",
      refreshedAt: new Date().toISOString(),
    };
    mocks.query.mockResolvedValueOnce({ rows: [row] });
    const request = new Request("https://example.test/api/meta");
    expect((await GET(request)).status).toBe(200);
    expect(mocks.invalidate).not.toHaveBeenCalled();

    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 46 * 60_000);
    mocks.query.mockResolvedValueOnce({ rows: [{
      ...row, plays: "20", wins: "14", refreshedAt: new Date(Date.now()).toISOString(),
    }] });
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-meta-refreshed-at")).toBe(new Date(Date.now()).toISOString());
    expect(await response.json()).toMatchObject([{ brawlers: [{ plays: 20, wins: 14 }] }]);
    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect((await GET(request)).status).toBe(200);
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });

  it("accepts a genuinely empty refreshed snapshot instead of retaining old recommendations", async () => {
    mocks.cached = { maps: [{ map: "Old Map" }], refreshedAt: new Date(Date.now() - 46 * 60_000).toISOString() };
    mocks.query.mockResolvedValueOnce({ rows: [] });
    const response = await GET(new Request("https://example.test/api/meta"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});
