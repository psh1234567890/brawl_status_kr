import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRateLimitBucketsForTest,
  consumeRateLimit,
  getClientAddress,
  getRateLimitBucketCountForTest,
} from "./rateLimit";

describe("consumeRateLimit", () => {
  beforeEach(() => clearRateLimitBucketsForTest());

  it("rejects requests after the configured limit", () => {
    const options = { limit: 2, windowMs: 1_000 };
    expect(consumeRateLimit("profile:ip", options, 0).allowed).toBe(true);
    expect(consumeRateLimit("profile:ip", options, 100).allowed).toBe(true);
    expect(consumeRateLimit("profile:ip", options, 200).allowed).toBe(false);
  });

  it("opens a new window after the reset time", () => {
    const options = { limit: 1, windowMs: 1_000 };
    expect(consumeRateLimit("profile:ip", options, 0).allowed).toBe(true);
    expect(consumeRateLimit("profile:ip", options, 500).allowed).toBe(false);
    expect(consumeRateLimit("profile:ip", options, 1_000).allowed).toBe(true);
  });

  it("caps process-local buckets instead of growing without bound", () => {
    const options = { limit: 1, windowMs: 60_000 };
    for (let index = 0; index < 2_100; index += 1) {
      consumeRateLimit(`profile:ip-${index}`, options, 0);
    }

    expect(getRateLimitBucketCountForTest()).toBeLessThanOrEqual(2_000);
  });
});

describe("getClientAddress", () => {
  it("uses the platform-owned forwarded address on Vercel", () => {
    const request = new Request("https://example.com", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.10, 10.0.0.1",
        "x-forwarded-for": "192.0.2.1",
        "x-real-ip": "192.0.2.2",
      },
    });
    expect(getClientAddress(request, true)).toBe("203.0.113.10");
  });

  it("accepts a valid IPv6 platform address", () => {
    const request = new Request("https://example.com", {
      headers: { "x-vercel-forwarded-for": "2001:db8::1" },
    });
    expect(getClientAddress(request, true)).toBe("2001:db8::1");
  });

  it("does not trust caller-controlled forwarding headers on Vercel", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "192.0.2.7", "x-real-ip": "192.0.2.8" },
    });
    expect(getClientAddress(request, true)).toBe("vercel-ip-unavailable");
  });

  it("rejects an invalid platform-provided address", () => {
    const request = new Request("https://example.com", {
      headers: { "x-vercel-forwarded-for": "forged-ip" },
    });
    expect(getClientAddress(request, true)).toBe("vercel-ip-unavailable");
  });

  it("does not treat arbitrary local headers as a remote IP", () => {
    const request = new Request("https://example.com", {
      headers: { "x-vercel-forwarded-for": "203.0.113.10", "x-forwarded-for": "192.0.2.1" },
    });
    expect(getClientAddress(request, false)).toBe("local");
  });
});
