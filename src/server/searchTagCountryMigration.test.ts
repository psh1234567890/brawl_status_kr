import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "drizzle/0015_search_tag_country_hourly.sql"), "utf8");

describe("country aggregation migration safeguards", () => {
  it("creates a private country-only count without requester identifiers", () => {
    expect(sql).toContain("analytics_private.search_tag_country_hourly");
    expect(sql).toContain("PRIMARY KEY (hour_bucket, player_tag, country_code)");
    expect(sql).toContain("REVOKE ALL");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toMatch(/country_code char\(2\)/i);
    expect(sql).not.toMatch(/CREATE TABLE.*\b(ip|account|session|device)_/i);
  });
  it("keeps legacy base aggregates and expires country buckets on the same schedule", () => {
    expect(sql).toContain("brawl-search-tag-expire-hourly");
    expect(sql).toContain("DELETE FROM analytics_private.search_tag_hourly");
    expect(sql).toContain("DELETE FROM analytics_private.search_tag_country_hourly");
    expect(sql).toContain("7 days");
    expect(sql).not.toContain("DROP TABLE");
  });
});
