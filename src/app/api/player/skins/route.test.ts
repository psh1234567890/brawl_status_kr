import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimitBucketsForTest } from "../../../../server/rateLimit";
import { GET } from "./route";

describe("player skin inventory route", () => {
  beforeEach(() => {
    clearRateLimitBucketsForTest();
    vi.stubEnv("BRAWLACE_SKIN_LOOKUP_ENABLED", "false");
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("advertises disabled supplemental lookup without calling an upstream provider", async () => {
    const response = await GET(
      new Request("https://example.test/api/player/skins?tag=2PYLQ&supplemental=1"),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("x-skin-inventory-status")).toBe("disabled");
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(response.headers.get("server-timing")).toMatch(/^app;dur=\d+(?:\.\d+)?$/);
  });
});
