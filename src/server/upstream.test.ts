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

  async function settle<T>(request: Promise<T>): Promise<T> {
    const result = request.then((value) => ({ value }), (error: unknown) => ({ error }));
    await vi.runAllTimersAsync();
    const outcome = await result;
    if ("error" in outcome) throw outcome.error;
    return outcome.value;
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

  it("retries one cold transport error without retrying a provider access failure", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("connection reset"));
    fetchMock.mockResolvedValueOnce(Response.json(data));
    expect((await settle(client.fetchSnapshot(path, 30_000, 300_000))).data).toEqual(data);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockResolvedValueOnce(new Response("blocked", { status: 403 }));
    await expect(client.fetchSnapshot("/players/%238PQL", 30_000, 300_000)).rejects.toMatchObject({ status: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([408, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526])(
    "recovers a cold HTTP %i once and coalesces concurrent readers", async (status) => {
      fetchMock.mockResolvedValueOnce(new Response("private gateway detail", { status }));
      fetchMock.mockResolvedValueOnce(Response.json(data));
      const results = await settle(Promise.all([
        client.fetchSnapshot(path, 30_000, 300_000),
        client.fetchSnapshot(path, 30_000, 300_000),
      ]));
      expect(results[0].data).toEqual(data);
      expect(results[0].freshness.status).toBe("live");
      expect(results[1]).toEqual(results[0]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(console.warn).toHaveBeenCalledWith(JSON.stringify({
        event: "upstream_request_failed", resource: "player", status,
        reason: "http", attempt: 1, willRetry: true,
      }));
      const logs = String(vi.mocked(console.warn).mock.calls);
      for (const secret of ["private gateway detail", "unit-test-key", "2PYLQ", "proxy.example"]) {
        expect(logs).not.toContain(secret);
      }
    },
  );

  it("also retries a cold battle-log timeout within the original eight-second budget", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    fetchMock.mockImplementationOnce(() => new Promise((_, reject) => {
      setTimeout(() => reject(new DOMException("private timeout detail", "TimeoutError")), 4_000);
    }));
    fetchMock.mockResolvedValueOnce(Response.json({ items: [] }));
    const result = await settle(client.fetchSnapshot(`${path}/battlelog`, 15_000, 120_000));
    expect(result.data).toEqual({ items: [] });
    expect(timeout.mock.calls[0][0]).toBe(4_000);
    expect(timeout.mock.calls[1][0]).toBeGreaterThanOrEqual(3_751);
    expect(timeout.mock.calls[1][0]).toBeLessThanOrEqual(3_850);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('"resource":"battlelog"'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("limits a persistent gateway failure to two attempts, preserves its status, and does not cache it", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response("gateway failed", { status: 525 })));
    await expect(settle(client.fetchSnapshot(path, 30_000, 300_000))).rejects.toMatchObject({ status: 525 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenLastCalledWith(JSON.stringify({
      event: "upstream_request_failed", resource: "player", status: 525,
      reason: "http", attempt: 2, willRetry: false,
    }));
    fetchMock.mockResolvedValueOnce(Response.json(data));
    expect((await client.fetchSnapshot(path, 30_000, 300_000)).data).toEqual(data);
  });

  it("retries a transport failure while reading a successful response body", async () => {
    const interrupted = Response.json(data);
    vi.spyOn(interrupted, "json").mockRejectedValueOnce(new TypeError("private body connection reset"));
    fetchMock.mockResolvedValueOnce(interrupted);
    fetchMock.mockResolvedValueOnce(Response.json(data));
    expect((await settle(client.fetchSnapshot(path, 30_000, 300_000))).data).toEqual(data);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(vi.mocked(console.warn).mock.calls)).toContain('"reason":"network"');
    expect(String(vi.mocked(console.warn).mock.calls)).not.toContain("private body connection reset");
  });

  it("does not start another request after the total deadline has elapsed", async () => {
    fetchMock.mockImplementationOnce(async () => {
      vi.advanceTimersByTime(8_000);
      throw new DOMException("timeout", "TimeoutError");
    });
    await expect(settle(client.fetchSnapshot(path, 30_000, 300_000))).rejects.toMatchObject({ status: 504 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([400, 401, 403, 404, 429, 501, 505])("does not retry HTTP %i", async (status) => {
    fetchMock.mockResolvedValueOnce(new Response("provider failure", { status }));
    await expect(client.fetchSnapshot(path, 30_000, 300_000)).rejects.toMatchObject({ status });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not retry a provider's Retry-After response early", async () => {
    fetchMock.mockResolvedValueOnce(new Response("busy", { status: 503, headers: { "Retry-After": "30" } }));
    await expect(client.fetchSnapshot(path, 30_000, 300_000)).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("honors Retry-After even when the 503 response body is interrupted", async () => {
    const interrupted = new Response(null, { status: 503, headers: { "Retry-After": "30" } });
    vi.spyOn(interrupted, "json").mockRejectedValueOnce(new DOMException("body timeout", "TimeoutError"));
    fetchMock.mockResolvedValueOnce(interrupted);
    await expect(client.fetchSnapshot(path, 30_000, 300_000)).rejects.toMatchObject({ status: 503, retryable: false });
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

  it("explains confirmed API maintenance and recovers on the next lookup without caching the error", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({
      reason: "inMaintenance", message: "API is currently in maintenance, please come back later",
    }, { status: 503 }));
    await expect(client.fetchSnapshot(path, 30_000, 300_000)).rejects.toMatchObject({
      status: 503,
      message: "브롤스타즈 API가 점검 중입니다. 점검이 끝나면 다시 검색해 주세요.",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledWith(JSON.stringify({ event: "brawl_api_maintenance", status: 503 }));
    fetchMock.mockResolvedValueOnce(Response.json(data));
    expect((await client.fetchSnapshot(path, 30_000, 300_000)).data).toEqual(data);
  });

  it.each([null, "<html>gateway unavailable</html>", { message: "private provider detail" }, { reason: "otherFailure" }])(
    "does not label an unrelated 503 as maintenance or expose its response body: %j", async (body) => {
      fetchMock.mockImplementation(() => Promise.resolve(typeof body === "string"
        ? new Response(body, { status: 503 }) : Response.json(body, { status: 503 })));
      await expect(settle(client.fetchSnapshot(path, 30_000, 300_000))).rejects.toMatchObject({
        status: 503, message: "브롤스타즈 데이터를 불러오지 못했습니다.",
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const logs = String(vi.mocked(console.warn).mock.calls);
      expect(logs).not.toContain("brawl_api_maintenance");
      expect(logs).not.toContain("private provider detail");
    },
  );

  it("keeps the original stale-data age during confirmed maintenance", async () => {
    const original = await seed();
    vi.advanceTimersByTime(31_000);
    fetchMock.mockResolvedValueOnce(Response.json({ reason: "inMaintenance" }, { status: 503 }));
    const stale = await client.fetchSnapshot(path, 30_000, 300_000);
    expect(stale.data).toEqual(data);
    expect(stale.freshness).toEqual({ ...original.freshness, status: "stale" });
  });

  it.each([400, 401, 403, 404])("does not hide HTTP %i with stale data and invalidates the old entry", async (status) => {
    await seed();
    vi.advanceTimersByTime(31_000);
    fetchMock.mockResolvedValueOnce(new Response("error", { status }));
    await expect(client.fetchSnapshot(path, 30_000, 300_000)).rejects.toMatchObject({ status });
    fetchMock.mockImplementation(() => Promise.resolve(new Response("error", { status: 503 })));
    await expect(settle(client.fetchSnapshot(path, 30_000, 300_000))).rejects.toMatchObject({ status: 503 });
  });

  it("does not allow stale fallback implicitly or past its original maximum age", async () => {
    await seed();
    vi.advanceTimersByTime(31_000);
    fetchMock.mockRejectedValue(new TypeError("sensitive network error"));
    await expect(settle(client.fetchSnapshot(path, 30_000))).rejects.toMatchObject({ status: 503 });
    vi.advanceTimersByTime(270_000);
    fetchMock.mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    await expect(settle(client.fetchSnapshot(path, 30_000, 300_000))).rejects.toMatchObject({ status: 504 });
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
