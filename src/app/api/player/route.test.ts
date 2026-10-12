import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(), usage: vi.fn(), search: vi.fn(),
  callbacks: [] as Array<() => Promise<void>>,
}));
vi.mock("next/server", async (importOriginal) => ({
  ...await importOriginal<typeof import("next/server")>(),
  after: (callback: () => Promise<void>) => { mocks.callbacks.push(callback); },
}));
vi.mock("../../../server/upstream", () => ({
  fetchBrawlApiSnapshot: mocks.fetch,
  UpstreamApiError: class extends Error { status = 503; },
}));
vi.mock("../../../server/usageAnalytics", () => ({
  recordUsageEvent: mocks.usage,
  classifyPlayerSearchFailure: () => "player_search_error",
}));
vi.mock("../../../server/searchTagAnalytics", () => ({ recordSearchTag: mocks.search }));
vi.mock("../../../server/rateLimit", () => ({ rejectRateLimitedRequest: () => null }));
vi.mock("../../../server/sharedPublicRateLimit", () => ({ rejectSharedPublicRateLimit: async () => null }));
vi.mock("../../../server/observability", () => ({ withApiMonitoring: (_: string, handler: unknown) => handler }));
import { GET } from "./route";

describe("profile response is independent of analytics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.callbacks.length = 0;
    mocks.fetch.mockResolvedValue({ data: { tag: "#2PYLQ", name: "Player" }, freshness: { status: "live" } });
    mocks.usage.mockResolvedValue(undefined);
    mocks.search.mockResolvedValue(undefined);
  });

  it("sends the profile before running optional database writes", async () => {
    const response = await GET(new Request("https://example.test/api/player?tag=2PYLQ"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ tag: "#2PYLQ" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.usage).not.toHaveBeenCalled();
    expect(mocks.search).not.toHaveBeenCalled();
    await mocks.callbacks[0]();
    expect(mocks.usage).toHaveBeenCalledWith("player_search_success", expect.any(Request));
    expect(mocks.search).toHaveBeenCalledWith("2PYLQ", expect.any(Request));
  });

  it("also sends upstream failures before writing error counters", async () => {
    mocks.fetch.mockRejectedValue(new Error("upstream unavailable"));
    const response = await GET(new Request("https://example.test/api/player?tag=2PYLQ"));
    expect(response.status).toBe(502);
    expect(mocks.usage).not.toHaveBeenCalled();
    await mocks.callbacks[0]();
    expect(mocks.usage).toHaveBeenCalledTimes(2);
    expect(mocks.search).not.toHaveBeenCalled();
  });
});
