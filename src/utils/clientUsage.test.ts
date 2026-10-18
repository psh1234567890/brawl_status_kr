import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendUsageEvents, trackProductAction } from "./clientUsage";
import { PRODUCT_SESSION_KEY } from "./productFunnel";

const values = new Map<string, string>();
const post = vi.fn().mockResolvedValue({ ok: true });
beforeEach(() => {
  values.clear(); post.mockClear();
  vi.stubGlobal("window", {});
  vi.stubGlobal("document", { cookie: "" });
  vi.stubGlobal("fetch", post);
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
});
afterEach(() => vi.unstubAllGlobals());
describe("product analytics transport", () => {
  it("transmits fixed counters without the local session timestamp or flags", () => {
    sendUsageEvents(["page_view"]);
    trackProductAction("search");
    trackProductAction("meta");
    const bodies = post.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(bodies.every(body => Object.keys(body).length === 1 && ("event" in body || "events" in body))).toBe(true);
    expect(JSON.stringify(bodies)).toContain("funnel_after_meta");
    expect(JSON.stringify(bodies)).not.toMatch(/timestamp|sessionId|playerTag|account|followups|"at"/);
    expect(values.has(PRODUCT_SESSION_KEY)).toBe(true);
  });
  it("does not send or infer any flow when the visitor opts out", () => {
    vi.stubGlobal("document", { cookie: "brawl_analytics_opt_out=1" });
    trackProductAction("search"); sendUsageEvents(["page_view"]);
    expect(post).not.toHaveBeenCalled(); expect(values.size).toBe(0);
  });
  it("keeps basic PV counting but does not guess sessions when storage is blocked", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("Blocked"); } });
    sendUsageEvents(["page_view"]); trackProductAction("search");
    expect(post).toHaveBeenCalledOnce();
    expect(JSON.parse(post.mock.calls[0][1].body)).toEqual({ event: "page_view" });
  });
});
