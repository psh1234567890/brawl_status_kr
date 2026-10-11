import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

const testUrl = process.env.DATA_STATUS_TEST_DATABASE_URL;
if (testUrl) {
  let safe = false;
  try {
    const url = new URL(testUrl);
    safe = ["postgres:", "postgresql:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      url.pathname.endsWith("_test");
  } catch { /* Missing or invalid test URL must never reach a production DB. */ }
  if (!safe) throw new Error("Lifetime migration test requires an isolated local *_test database.");
}

describe.skipIf(!testUrl)("lifetime usage migration and hourly write trigger", () => {
  const client = new Client({ connectionString: testUrl, ssl: false });
  beforeAll(async () => {
    await client.connect();
    await client.query("BEGIN");
    await client.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
    END $$;`);
    await client.query("CREATE SCHEMA analytics_private");
    await client.query(`CREATE TABLE analytics_private.usage_hourly (
      hour_bucket timestamptz NOT NULL, event_kind text NOT NULL,
      event_count bigint NOT NULL, PRIMARY KEY (hour_bucket, event_kind)
    )`);
    await client.query(`INSERT INTO analytics_private.usage_hourly VALUES
      ('2026-10-10T00:00:00Z', 'visit_session', 5),
      ('2026-10-10T00:00:00Z', 'player_search_success', 2)`);
    const migration = readFileSync(resolve(process.cwd(), "drizzle/0011_private_usage_lifetime.sql"), "utf8");
    await client.query(migration);
  });
  afterAll(async () => {
    try { await client.query("ROLLBACK"); } finally { await client.end(); }
  });

  it("backfills existing counts and does not duplicate them when re-applied", async () => {
    const rows = await client.query(`SELECT event_kind, event_count::int AS count
      FROM analytics_private.usage_lifetime ORDER BY event_kind`);
    expect(rows.rows).toEqual([
      { event_kind: "player_search_success", count: 2 },
      { event_kind: "visit_session", count: 5 },
    ]);
    const migration = readFileSync(resolve(process.cwd(), "drizzle/0011_private_usage_lifetime.sql"), "utf8");
    await client.query(migration);
    const result = await client.query(`SELECT event_count::int AS count
      FROM analytics_private.usage_lifetime WHERE event_kind = 'visit_session'`);
    expect(result.rows[0].count).toBe(5);
  });

  it("increments exactly once per insert/upsert and does not subtract expired hourly buckets", async () => {
    await client.query(`INSERT INTO analytics_private.usage_hourly VALUES
      ('2026-10-11T00:00:00Z', 'visit_session', 1)
      ON CONFLICT (hour_bucket, event_kind) DO UPDATE SET
        event_count = analytics_private.usage_hourly.event_count + 1`);
    await client.query(`INSERT INTO analytics_private.usage_hourly VALUES
      ('2026-10-11T00:00:00Z', 'visit_session', 1)
      ON CONFLICT (hour_bucket, event_kind) DO UPDATE SET
        event_count = analytics_private.usage_hourly.event_count + 1`);
    await client.query("DELETE FROM analytics_private.usage_hourly WHERE hour_bucket < '2026-10-11T00:00:00Z'");
    const result = await client.query(`SELECT event_count::int AS count, first_seen_at::text AS first
      FROM analytics_private.usage_lifetime WHERE event_kind = 'visit_session'`);
    expect(result.rows[0].count).toBe(7);
    expect(new Date(result.rows[0].first).toISOString()).toBe("2026-10-10T00:00:00.000Z");
  });
});
