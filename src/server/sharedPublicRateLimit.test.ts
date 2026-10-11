import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ consume: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./accountRateLimit", () => ({ consumeAccountRateLimits: mocks.consume }));

import { rejectSharedPublicRateLimit } from "./sharedPublicRateLimit";

describe("cross-instance rate limit for public writes", () => {
  beforeEach(() => {
    mocks.consume.mockReset();
    vi.stubEnv("VERCEL", "1");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("uses the trusted platform address and a bounded, namespaced rule", async () => {
    mocks.consume.mockResolvedValue({ allowed: true, retryAfter: 0 });
    const request = new Request("https://example.test/api/player/matches", {
      headers: { "x-vercel-forwarded-for": "203.0.113.20", "x-forwarded-for": "192.0.2.1" },
    });
    expect(await rejectSharedPublicRateLimit(request, "public-matches-save", 15)).toBeNull();
    expect(mocks.consume).toHaveBeenCalledWith([{ scope: "public-matches-save", subject: "203.0.113.20", windowSeconds: 60, maxRequests: 15 }]);
  });

  it("returns 429 and Retry-After when the shared counter denies", async () => {
    mocks.consume.mockResolvedValue({ allowed: false, retryAfter: 23 });
    const response = await rejectSharedPublicRateLimit(new Request("https://example.test"), "public-matches-save", 15);
    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("23");
  });

  it("falls back to the separately enforced local guard on database failure", async () => {
    mocks.consume.mockRejectedValue(new Error("sensitive DB details"));
    expect(await rejectSharedPublicRateLimit(new Request("https://example.test"), "public-matches-save", 15)).toBeNull();
    expect(String(vi.mocked(console.warn).mock.calls)).not.toContain("sensitive DB details");
  });
});
