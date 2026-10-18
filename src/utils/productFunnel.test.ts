import { describe, expect, it } from "vitest";
import { advanceProductSession } from "./productFunnel";

const start = Date.parse("2026-10-18T01:00:00Z");
function journey(actions: Parameters<typeof advanceProductSession>[1][]) {
  let raw: string | null = null;
  const events: string[] = [];
  for (const action of actions) {
    const next = advanceProductSession(raw, action, start);
    raw = JSON.stringify(next.state);
    events.push(...next.events);
  }
  return { raw, events };
}
describe("identifier-free product journey", () => {
  it("counts searches and each later action once, including after a reload", () => {
    const { raw, events } = journey(["view", "search", "search", "meta", "meta", "compare", "share", "save"]);
    expect(events.filter(event => event === "funnel_session")).toHaveLength(1);
    expect(events.filter(event => event === "funnel_active")).toHaveLength(1);
    expect(events.filter(event => event === "funnel_search")).toHaveLength(1);
    expect(events.filter(event => event === "funnel_followup")).toHaveLength(1);
    expect(events.filter(event => event.startsWith("funnel_after_"))).toHaveLength(4);
    expect(advanceProductSession(raw, "meta", start + 1_000).events).toEqual([]);
  });
  it("does not turn a page view or a recommendation preceding search into a search conversion", () => {
    expect(journey(["view"]).events).toEqual(["funnel_session"]);
    expect(journey(["meta", "search"]).events).not.toContain("funnel_followup");
    expect(journey(["meta", "search", "meta"]).events).toContain("funnel_after_meta");
  });
  it("does not attribute a later session's action to an old search", () => {
    const { raw } = journey(["search"]);
    expect(advanceProductSession(raw, "meta", start + 30 * 60_000).events).toEqual(["funnel_session", "funnel_active"]);
  });
  it("keeps daily KST denominators together by resetting across midnight", () => {
    const before = advanceProductSession(null, "search", Date.parse("2026-10-18T14:59:00Z"));
    const after = advanceProductSession(JSON.stringify(before.state), "compare", Date.parse("2026-10-18T15:01:00Z"));
    expect(after.events).toEqual(["funnel_session", "funnel_active"]);
  });
  it("discards corrupt state and resets after a clock rollback", () => {
    expect(advanceProductSession('{"tag":"PRIVATE"}', "view", start).state).toEqual({ at: start, active: false, search: false, followups: 0 });
    const { raw } = journey(["search"]);
    expect(advanceProductSession(raw, "share", start - 1).events).toEqual(["funnel_session"]);
  });
});
