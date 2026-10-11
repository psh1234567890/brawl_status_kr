import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  getAuthenticatedAccount: vi.fn(),
  getClientAddress: vi.fn(),
}));
vi.mock("../db", () => ({ db: { $client: { query: mocks.query } } }));
vi.mock("./account", () => ({ getAuthenticatedAccount: mocks.getAuthenticatedAccount }));
vi.mock("./rateLimit", () => ({ getClientAddress: mocks.getClientAddress }));
import { hasSearchDetailConsent, maskIpRange, recordConsentedSearchDetail, readRecentConsentedSearches } from "./usageSearchDetails";

const req = (cookie = "") => new Request("https://www.brawl-o1.site/api/player?tag=9C82J8YPP",
  { headers: { cookie } });
const UUID = "11111111-1111-4111-8111-111111111111";

describe("consented diagnostic details", () => {
  beforeEach(() => {
    process.env.VERCEL_ENV = "production";
    mocks.query.mockReset().mockResolvedValue({ rows: [] });
    mocks.getAuthenticatedAccount.mockReset().mockResolvedValue({ userId: UUID });
    mocks.getClientAddress.mockReset().mockReturnValue("203.0.113.45");
  });
  afterEach(() => { delete process.env.VERCEL_ENV; });

  it("does not collect anything without explicit consent or when opted out", async () => {
    expect(hasSearchDetailConsent(req())).toBe(false);
    expect(hasSearchDetailConsent(req("brawl_search_detail_consent=0"))).toBe(false);
    expect(hasSearchDetailConsent(req("brawl_search_detail_consent=1; brawl_analytics_opt_out=1"))).toBe(false);
    for (const cookie of ["", "brawl_search_detail_consent=0", "brawl_search_detail_consent=1; brawl_analytics_opt_out=1"]) {
      await recordConsentedSearchDetail(req(cookie), "9C82J8YPP");
    }
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.getAuthenticatedAccount).not.toHaveBeenCalled();
  });
  it("never records preview activity even if opted in", async () => {
    process.env.VERCEL_ENV = "preview";
    await recordConsentedSearchDetail(req("brawl_search_detail_consent=1"), "9C82J8YPP");
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("masks IPv4, IPv6 and invalid input", () => {
    expect(maskIpRange("203.0.113.45")).toBe("203.0.x.x");
    expect(maskIpRange("2001:db8:abcd:4444:5555:6666:7777:8888")).toBe("2001:db8:…");
    expect(maskIpRange("::ffff:192.0.2.128")).toBe("IPv4-mapped (masked)");
    expect(maskIpRange("::ffff:c000:0280")).toBe("ffff:c000:…");
    expect(maskIpRange("198.51.100.11, 10.0.0.1")).toBeNull();
    expect(maskIpRange("vercel-ip-unavailable")).toBeNull();
  });
  it("saves only validated public tag, masked network and verified account UUID", async () => {
    await recordConsentedSearchDetail(req("other=1; brawl_search_detail_consent=1"), "9C82J8YPP");
    expect(mocks.query).toHaveBeenCalledTimes(2);
    const [sql, values] = mocks.query.mock.calls[0];
    expect(String(sql)).toContain("analytics_private.consented_search_details");
    expect(values).toEqual(["9C82J8YPP", "203.0.x.x", UUID]);
    expect(JSON.stringify(values)).not.toContain("203.0.113.45");
    expect(mocks.query.mock.calls[1][0]).toContain("DELETE FROM analytics_private.consented_search_details");
  });
  it("allows opted-in guests without exposing login errors", async () => {
    mocks.getAuthenticatedAccount.mockRejectedValue(new Error("no session"));
    await recordConsentedSearchDetail(req("brawl_search_detail_consent=1"), "9C82J8YPP");
    expect(mocks.query.mock.calls[0][1]).toEqual(["9C82J8YPP", "203.0.x.x", null]);
  });
  it("admin query bounds history to seven days and 40 entries", async () => {
    await readRecentConsentedSearches();
    const sql = String(mocks.query.mock.calls[0][0]);
    expect(sql).toContain("LIMIT 40");
    expect(sql).toContain("7 days");
    expect(sql).not.toMatch(/u\.email/);
  });
});
