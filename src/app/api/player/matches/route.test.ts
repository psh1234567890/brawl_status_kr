import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), save: vi.fn() }));
vi.mock("../../../../server/upstream", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../../../server/upstream")>(),
  fetchBrawlApiSnapshot: mocks.fetch,
}));
vi.mock("../../../../server/battleLogs", () => ({ saveBattleLogs: mocks.save }));
import { clearRateLimitBucketsForTest } from "../../../../server/rateLimit";
import { UpstreamApiError } from "../../../../server/upstream";
import { GET, POST } from "./route";

function request(method = "POST", origin = "https://example.test") {
  return new Request("https://example.test/api/player/matches?tag=2PYLQ", {
    method, headers: { origin, "sec-fetch-site": "same-origin" },
  });
}
const items = [{ battleTime: "20261010T000000.000Z" }];
describe("battle lookup and persistence isolation", () => {
  beforeEach(() => {
    clearRateLimitBucketsForTest();
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.fetch.mockResolvedValue({ data: { items }, freshness: { status: "live", fetchedAt: "2026-10-10T00:00:00Z" } });
    mocks.save.mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("still returns authentic battles when database persistence is unavailable", async () => {
    mocks.save.mockRejectedValue(new Error("sensitive database detail"));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ items, storageStatus: "unavailable" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(String(vi.mocked(console.warn).mock.calls)).not.toContain("sensitive database detail");
  });

  it("does not rewrite stale battles and preserves the original fetched timestamp", async () => {
    mocks.fetch.mockResolvedValue({ data: { items }, freshness: { status: "stale", fetchedAt: "2026-10-10T00:00:00Z" } });
    const response = await POST(request());
    expect(await response.json()).toMatchObject({ storageStatus: "skipped-stale", dataFreshness: { status: "stale", fetchedAt: "2026-10-10T00:00:00Z" } });
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("keeps GET read-only and POST origin protection intact", async () => {
    expect((await GET(request("GET"))).status).toBe(200);
    expect(mocks.save).not.toHaveBeenCalled();
    expect((await POST(request("POST", "https://attacker.test"))).status).toBe(403);
    expect(mocks.fetch).toHaveBeenCalledOnce();
  });

  it("preserves a genuine not-found response", async () => {
    mocks.fetch.mockRejectedValue(new UpstreamApiError(404, "Not found"));
    expect((await POST(request())).status).toBe(404);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
