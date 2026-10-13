import { afterEach, describe, expect, it, vi } from "vitest";
import { browserSessionEvents } from "./usageEvents";
import { browserReturnShare } from "./adminUsageMetrics";
import { emptyFinance, financeSummary } from "./monthlyFinance";
import { parsePublicProfiles, rememberPublicProfile, PROFILE_CACHE_KEY } from "./publicProfileCache";

afterEach(() => vi.unstubAllGlobals());
describe("anonymous monetization metrics", () => {
  const now = Date.parse("2026-10-13T00:00:00Z");
  it("distinguishes session boundaries, seven-day returns and invalid clocks", () => {
    expect(browserSessionEvents(null, now)).toEqual(["browser_session"]);
    expect(browserSessionEvents(String(now - 29 * 60_000), now)).toEqual([]);
    expect(browserSessionEvents(String(now - 30 * 60_000), now)).toEqual(["browser_session", "browser_return_7d"]);
    expect(browserSessionEvents(String(now - 7 * 86_400_000), now)).toHaveLength(2);
    expect(browserSessionEvents(String(now - 7 * 86_400_000 - 1), now)).toEqual(["browser_session"]);
    expect(browserSessionEvents(String(now + 1), now)).toEqual(["browser_session"]);
    expect(browserReturnShare(0, 0)).toBeNull();
    expect(browserReturnShare(3, 10)).toBe(30);
    expect(browserReturnShare(11, 10)).toBeNull();
  });
  it("keeps unknown finance inputs distinct from confirmed zero income", () => {
    expect(financeSummary(emptyFinance)).toBeNull();
    const known = { month: "2026-10", advertising: "0", sponsorship: "10000", donations: "0", hosting: "1000", database: "2000", domain: "100", other: "0" };
    expect(financeSummary(known)).toEqual({ revenue: 10000, costs: 3100, profit: 6900 });
    expect(financeSummary({ ...known, hosting: "" })).toBeNull();
    expect(financeSummary({ ...known, hosting: "-1" })).toBeNull();
    expect(financeSummary({ ...known, advertising: "0", sponsorship: "0" })?.profit).toBe(-3100);
  });
  it("rejects stale, corrupt and duplicate public profiles", () => {
    const valid = { tag: "#2PYLQ", name: "Player", trophies: 500, checkedAt: now };
    expect(parsePublicProfiles(JSON.stringify([valid, valid, { ...valid, tag: "2QQ", checkedAt: now - 31 * 86_400_000 }, { ...valid, tag: "PRIVATE" }]), now)).toHaveLength(1);
    expect(parsePublicProfiles("not json", now)).toEqual([]);
    expect(parsePublicProfiles(JSON.stringify([{ ...valid, trophies: -1 }]), now)).toEqual([]);
  });
  it("preserves the previous trophy baseline across duplicate renders", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
    rememberPublicProfile({ tag: "#2PYLQ", name: "Player", trophies: 500 }, now);
    rememberPublicProfile({ tag: "#2PYLQ", name: "Player", trophies: 550 }, now + 60_000);
    rememberPublicProfile({ tag: "#2PYLQ", name: "Player", trophies: 550 }, now + 60_001);
    expect(parsePublicProfiles(values.get(PROFILE_CACHE_KEY)!, now + 60_001)[0]).toMatchObject({ trophies: 550, previousTrophies: 500 });
  });
});
