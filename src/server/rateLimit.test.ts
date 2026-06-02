import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRateLimitBucketsForTest,
  consumeRateLimit,
  getClientAddress,
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
});

describe("getClientAddress", () => {
  it("uses the first forwarded address", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });
    expect(getClientAddress(request)).toBe("203.0.113.10");
  });
});

