import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const query = vi.hoisted(() => vi.fn());
vi.mock("../db", () => ({ db: { $client: { query } } }));
import { readRecentSearchTags, readSearchCountries7Days, recordSearchTag, searchVisitorCountry } from "./searchTagAnalytics";

describe("automatic privacy-minimal tag analytics", () => {
  beforeEach(() => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL = "1";
    query.mockReset().mockResolvedValue({ rows: [] });
  });
  afterEach(() => { delete process.env.VERCEL_ENV; delete process.env.VERCEL; });

  it("counts a searched tag and country atomically, without visitor identifiers", async () => {
    await recordSearchTag("#9C82J8YPP", new Request("https://example.com", {
      headers: { cookie: "brawl_search_detail_consent=0", "x-vercel-forwarded-for": "203.0.113.8", "x-vercel-ip-country": "KR" },
    }));
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][1]).toEqual(["9C82J8YPP", "KR"]);
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain("WITH counted AS");
    expect(sql).toContain("ON CONFLICT");
    expect(sql).toContain("search_tag_hourly");
    expect(sql).toContain("search_tag_country_hourly");
    expect(sql).toContain("SELECT hour_bucket, player_tag, $2, 1 FROM counted");
    expect(sql).not.toMatch(/ip_address|account_id|user_agent|consented_search_details/i);
    expect(JSON.stringify(query.mock.calls[0])).not.toContain("203.0.113.8");
  });
  it("accepts only two-letter country codes on Vercel and defaults safely to unknown", async () => {
    const request = (code: string) => new Request("https://example.com", { headers: { "x-vercel-ip-country": code } });
    expect(searchVisitorCountry(request("jp"))).toBe("JP");
    expect(searchVisitorCountry(request("  US  "))).toBe("US");
    expect(searchVisitorCountry(request("KOR"))).toBe("ZZ");
    expect(searchVisitorCountry(request("1; DROP TABLE a"))).toBe("ZZ");
    expect(searchVisitorCountry(new Request("https://example.com"))).toBe("ZZ");
    delete process.env.VERCEL;
    expect(searchVisitorCountry(request("KR"))).toBe("ZZ");
  });
  it("does not collect on preview, invalid tag or analytics opt-out", async () => {
    process.env.VERCEL_ENV = "preview";
    await recordSearchTag("9C82J8YPP");
    process.env.VERCEL_ENV = "production";
    await recordSearchTag("invalid!!");
    await recordSearchTag("9C82J8YPP", new Request("https://example.com", { headers: {
      cookie: "brawl_analytics_opt_out=1",
    } }));
    expect(query).not.toHaveBeenCalled();
  });
  it("admin listing combines tags but does not join accounts or retrieve IPs", async () => {
    await readRecentSearchTags();
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain("SUM(search_count)");
    expect(sql).toContain("MAX(last_searched_at)");
    expect(sql).toContain("7 days");
    expect(sql).toContain("LIMIT 200");
    expect(sql).toContain("JOIN recent");
    expect(sql).toContain("jsonb_agg");
    expect(sql).toContain("LEFT JOIN breakdown");
    expect(sql).not.toMatch(/auth_users|ip_range|email|account_id|requester_ip/i);
  });
  it("country totals aggregate all searches without IP, accounts or per-request data", async () => {
    await readSearchCountries7Days();
    expect(query).toHaveBeenCalledOnce();
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain("SUM(search_count)");
    expect(sql).toContain("search_tag_country_hourly");
    expect(sql).toContain("GROUP BY country_code");
    expect(sql).toContain("7 days");
    expect(sql).not.toMatch(/ip_address|user_agent|request_id|account_id|auth_users/i);
  });
  it("does not count a blocked request and falls back to ZZ on valid search without country header", async () => {
    await recordSearchTag("#9C82J8YPP", new Request("https://example.com"));
    expect(query.mock.calls[0][1]).toEqual(["9C82J8YPP", "ZZ"]);
    query.mockClear();
    await recordSearchTag("#9C82J8YPP", new Request("https://example.com", {
      headers: { cookie: "brawl_analytics_opt_out=1", "x-vercel-ip-country": "US" },
    }));
    expect(query).not.toHaveBeenCalled();
  });
});
