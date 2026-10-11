import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("../db", () => ({ db: { execute: mocks.execute } }));
import { queryMapMetaStats } from "./metaStats";

describe("pre-aggregated map meta", () => {
  it("reads a bounded private materialized snapshot without scanning source tables", async () => {
    mocks.execute.mockResolvedValueOnce({ rows: [{ mode: "gemGrab", map: "Hard Rock Mine", plays: "42" }] });
    const result = await queryMapMetaStats(10);
    expect(result.rows[0].plays).toBe("42");
    const { sql, params } = new PgDialect().sqlToQuery(mocks.execute.mock.calls[0][0]);
    expect(sql).toContain("analytics_private.meta_brawler_snapshot");
    expect(sql).toContain("refreshed_at");
    expect(sql).not.toContain("battle_team_participants");
    expect(params).toEqual([10]);
  });
});
