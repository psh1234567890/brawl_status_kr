import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const query = vi.hoisted(() => vi.fn());
vi.mock("../db", () => ({ db: { $client: { query } } }));
import { readRecentSearchTags, recordSearchTag } from "./searchTagAnalytics";

describe("automatic privacy-minimal tag analytics", () => {
  beforeEach(() => {
    process.env.VERCEL_ENV = "production";
    query.mockReset().mockResolvedValue({ rows: [] });
  });
  afterEach(() => { delete process.env.VERCEL_ENV; });

  it("collects valid searched tag without consent or visitor identifier", async () => {
    await recordSearchTag("#9C82J8YPP", new Request("https://example.com", {
      headers: { cookie: "brawl_search_detail_consent=0", "x-vercel-forwarded-for": "203.0.113.8" },
    }));
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][1]).toEqual(["9C82J8YPP"]);
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain("ON CONFLICT");
    expect(sql).toContain("search_tag_hourly");
    expect(sql).not.toMatch(/ip_address|account_id|user_agent|consented_search_details/i);
    expect(JSON.stringify(query.mock.calls[0])).not.toContain("203.0.113.8");
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
    expect(sql).not.toMatch(/JOIN|auth_users|ip_range|email|account/i);
  });
});
