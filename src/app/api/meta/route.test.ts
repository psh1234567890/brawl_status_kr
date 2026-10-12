import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), cached: undefined as unknown }));
vi.mock("next/cache", () => ({
  unstable_cache: (read: () => Promise<unknown>) => async () => {
    if (mocks.cached === undefined) mocks.cached = await read();
    return mocks.cached;
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

  it("rejects a cached snapshot after its timestamp ages past the limit", async () => {
    mocks.query.mockResolvedValue({ rows: [{
      mode: "gemGrab", map: "Hard Rock Mine", brawlerName: "SHELLY",
      brawlerId: 1, plays: "10", wins: "6", draws: "0",
      refreshedAt: new Date().toISOString(),
    }] });
    const request = new Request("https://example.test/api/meta");
    expect((await GET(request)).status).toBe(200);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 46 * 60_000);
    expect((await GET(request)).status).toBe(503);
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });
});
