import { describe, expect, it } from "vitest";
import { rejectCrossSiteMutation } from "./requestGuard";

describe("rejectCrossSiteMutation", () => {
  it("allows same-origin mutations", () => {
    const request = new Request("https://www.brawl-o1.site/api/player/matches", {
      method: "POST",
      headers: { origin: "https://www.brawl-o1.site" },
    });

    expect(rejectCrossSiteMutation(request)).toBeNull();
  });

  it("rejects cross-origin mutations", () => {
    const request = new Request("https://www.brawl-o1.site/api/player/matches", {
      method: "POST",
      headers: { origin: "https://example.com" },
    });

    expect(rejectCrossSiteMutation(request)?.status).toBe(403);
  });

  it("rejects requests marked cross-site by fetch metadata", () => {
    const request = new Request("https://www.brawl-o1.site/api/player/matches", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site" },
    });

    expect(rejectCrossSiteMutation(request)?.status).toBe(403);
  });
});
