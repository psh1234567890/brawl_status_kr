import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ recordUsageEvent: vi.fn() }));
vi.mock("../../../../server/usageAnalytics", () => ({
  isUsageKind: (x: unknown) => ["visit_session", "minigame_map_quiz"].includes(String(x)),
  recordUsageEvent: mocks.recordUsageEvent,
}));
import { POST } from "./route";

function event(body: unknown, origin = "https://www.brawl-o1.site") {
  return new Request("https://www.brawl-o1.site/api/usage/event", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
describe("anonymous usage event endpoint", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("rejects cross-site submissions", async () => {
    expect((await POST(event({ event: "visit_session" }, "https://attacker.example"))).status).toBe(403);
    expect(mocks.recordUsageEvent).not.toHaveBeenCalled();
  });
  it("rejects arbitrary identifiers and forged search events", async () => {
    for (const input of [
      { event: "player_search_success" },
      { event: "player_search_error_404" },
      { event: "player_search_error_429" },
      { event: "player_search_error_5xx" },
      { event: "player_search_error_other" },
      { event: "visit_session", playerTag: "PRIVATE" },
      { event: "evil" },
    ]) {
      expect((await POST(event(input))).status).toBe(400);
    }
    expect(mocks.recordUsageEvent).not.toHaveBeenCalled();
  });
  it("accepts a supported anonymous event", async () => {
    const request = event({ event: "minigame_map_quiz" });
    const response = await POST(request);
    expect(response.status).toBe(204);
    expect(mocks.recordUsageEvent).toHaveBeenCalledWith("minigame_map_quiz", request);
  });
});
