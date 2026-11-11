import { describe, expect, it, vi } from "vitest";
vi.mock("../../../server/rateLimit", () => ({ rejectRateLimitedRequest: () => null }));
import { GET, POST } from "./route";

describe("draft recommendation endpoint", () => {
  it("offers model capabilities without requiring a database", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ season: 55, trainingSets: 2695474 });
  });
  it("returns recommendations and a measured inference duration", async () => {
    const response = await POST(new Request("http://localhost/api/recommendation", { method: "POST", body: JSON.stringify({
      map: "Double Swoosh", mode: "gemGrab", allies: ["ALLI", "MEEPLE"], opponents: ["WENDY", "COLETTE", "MAISIE"],
    }) }));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject({ candidateCount: 102, baselineSource: "season55-training" });
    expect(result.modelRecommendations[0].brawler).toBe("TARA");
    expect(result.inferenceMs).toBeGreaterThanOrEqual(0);
  });
  it("returns a helpful 400 for malformed JSON", async () => {
    const response = await POST(new Request("http://localhost/api/recommendation", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
  });
});
