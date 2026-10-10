import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBrawlApiClient, resolveBrawlApiBaseUrl, UpstreamApiError } from "./upstream";

describe("resolveBrawlApiBaseUrl", () => {
  it("requires an explicit base URL", () => {
    expect(() => resolveBrawlApiBaseUrl(undefined)).toThrow(UpstreamApiError);
    expect(() => resolveBrawlApiBaseUrl("   ")).toThrow("서버 API 연결 설정이 없습니다.");
  });

  it("accepts HTTPS and removes the trailing slash", () => {
    expect(resolveBrawlApiBaseUrl(" https://proxy.example/v1/ ")).toBe(
      "https://proxy.example/v1",
    );
  });

  it("rejects insecure or credential-bearing URLs", () => {
    expect(() => resolveBrawlApiBaseUrl("http://proxy.example/v1")).toThrow(
      "HTTPS URL",
    );
    expect(() => resolveBrawlApiBaseUrl("https://user:pass@proxy.example/v1")).toThrow(
      "HTTPS URL",
    );
  });

  it("rejects malformed URLs", () => {
    expect(() => resolveBrawlApiBaseUrl("not-a-url")).toThrow(
      "연결 주소가 올바르지 않습니다.",
    );
  });
});

describe("Brawl API outage handling", () => {
  const path = "/players/%232PYLQ";
  const data = { tag: "#2PYLQ", name: "Test player" };
  const fetchMock = vi.fn();
  let client: ReturnType<typeof createBrawlApiClient>;

  beforeEach(() => {
    client = createBrawlApiClient();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T00:00:00Z"));
    vi.stubEnv("BRAWL_STARS_API_KEY", "unit-test-key");
    vi.stubEnv("BRAWL_STARS_API_BASE_URL", "https://proxy.example/v1");
    vi.stubGlobal("fetch", fetchMock.mockReset());
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  async function seed() {
    fetchMock.mockResolvedValueOnce(Response.json(data));
    return client.fetchSnapshot(path, 30_000, 300_000);
  }

  it("coalesces parallel refreshes and serves the original fresh timestamp", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(data));
    const [a, b] = await Promise.all([
      client.fetchSnapshot(path, 30_000, 300_000), client.fetchSnapshot(path, 30_000, 300_000),
    ]);
    expect(a).toEqual(b);
    vi.advanceTimersByTime(5_000);
    const cached = await client.fetchSnapshot(path, 30_000, 300_000);
    expect(cached.freshness).toEqual({ ...a.freshness, status: "cached" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([429, 503, 520, 525])("uses explicitly labeled stale data on temporary HTTP %i", async (status) => {
    const original = await seed();
    vi.advanceTimersByTime(31_000);
    fetchMock.mockResolvedValueOnce(new Response("provider failure", { status }));
    const stale = await client.fetchSnapshot(path, 30_000, 300_000);
    expect(stale.data).toEqual(data);
    expect(stale.freshness).toEqual({ ...original.freshness, status: "stale" });
    await client.fetchSnapshot(path, 30_000, 300_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(vi.mocked(console.warn).mock.calls)).not.toContain("unit-test-key");
    expect(String(vi.mocked(console.warn).mock.calls)).not.toContain("2PYLQ");
  });

  it.each([400, 401, 403, 404])("does not hide HTTP %i with stale data and invalidates the old entry", async (status) => {
    await seed();
    vi.advanceTimersByTime(31_000);
    fetchMock.mockResolvedValueOnce(new Response("error", { status }));
    await expect(client.fetchSnapshot(path, 30_000, 300_000)).rejects.toMatchObject({ status });
    fetchMock.mockResolvedValueOnce(new Response("error", { status: 503 }));
    await expect(client.fetchSnapshot(path, 30_000, 300_000)).rejects.toMatchObject({ status: 503 });
  });

  it("does not allow stale fallback implicitly or past its original maximum age", async () => {
    await seed();
    vi.advanceTimersByTime(31_000);
    fetchMock.mockRejectedValueOnce(new TypeError("sensitive network error"));
    await expect(client.fetchSnapshot(path, 30_000)).rejects.toMatchObject({ status: 503 });
    vi.advanceTimersByTime(270_000);
    fetchMock.mockRejectedValueOnce(new DOMException("timeout", "TimeoutError"));
    await expect(client.fetchSnapshot(path, 30_000, 300_000)).rejects.toMatchObject({ status: 504 });
  });

  it("replaces stale data after recovery and keeps configuration and tags isolated", async () => {
    await seed();
    vi.advanceTimersByTime(31_000);
    fetchMock.mockResolvedValueOnce(new Response("error", { status: 503 }));
    await client.fetchSnapshot(path, 30_000, 300_000);
    vi.advanceTimersByTime(5_001);
    fetchMock.mockResolvedValueOnce(Response.json({ ...data, name: "Updated" }));
    expect((await client.fetchSnapshot(path, 30_000, 300_000)).data).toMatchObject({ name: "Updated" });
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(client.fetchSnapshot("/players/%238PQL", 30_000, 300_000)).rejects.toMatchObject({ status: 503 });
    vi.stubEnv("BRAWL_STARS_API_BASE_URL", "https://other.example/v1");
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(client.fetchSnapshot(path, 30_000, 300_000)).rejects.toMatchObject({ status: 503 });
    vi.stubEnv("BRAWL_STARS_API_KEY", "");
    await expect(client.fetchSnapshot(path, 30_000, 300_000)).rejects.toMatchObject({ status: 500 });
  });

  it("never caches malformed or empty success responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>gateway error</html>", { status: 200 }));
    await expect(client.fetchSnapshot(path, 30_000, 300_000)).rejects.toMatchObject({ status: 502 });
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    await expect(client.fetchSnapshot(path, 30_000, 300_000)).rejects.toMatchObject({ status: 502 });
    fetchMock.mockResolvedValueOnce(Response.json(data));
    expect((await client.fetchSnapshot(path, 30_000, 300_000)).data).toEqual(data);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("keeps the fallback cache bounded", async () => {
    client = createBrawlApiClient(1);
    await seed();
    fetchMock.mockResolvedValueOnce(Response.json({ tag: "#8PQL" }));
    await client.fetchSnapshot("/players/%238PQL", 30_000, 300_000);
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(client.fetchSnapshot(path, 30_000, 300_000)).rejects.toMatchObject({ status: 503 });
  });
});
