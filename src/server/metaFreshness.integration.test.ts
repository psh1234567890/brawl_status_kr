import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Client } from "pg";

const testUrl = process.env.DATA_STATUS_TEST_DATABASE_URL;
if (testUrl) {
  let safe = false;
  try {
    const url = new URL(testUrl);
    safe = ["postgres:", "postgresql:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && url.pathname.endsWith("_test");
  } catch { /* Never include a credential-bearing URL in diagnostics. */ }
  if (!safe) throw new Error("Meta freshness integration requires a local disposable *_test database.");
}

describe.skipIf(!testUrl)("recommendation recency snapshot on disposable PostgreSQL", () => {
  const client = new Client({ connectionString: testUrl, ssl: false });
  const schema = `meta_quality_fixture_${process.pid}`;

  beforeAll(async () => {
    await client.connect();
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`CREATE TABLE ${schema}.battle_team_participants (
      mode text, map text, brawler_name text, brawler_id integer, result text, battle_timestamp timestamptz
    )`);
    await client.query(`CREATE TABLE ${schema}.battle_logs (
      mode text, map text, brawler_name text, brawler_id integer, result text, battle_timestamp timestamptz,
      meta_perspective_only boolean
    )`);
    const migration = await readFile(new URL("../../drizzle/20261021054929_meta_recommendation_freshness.sql", import.meta.url), "utf8");
    // Exercise the actual view/index DDL in an isolated rolled-back schema.
    // CI lacks Supabase's cron extension/roles; their production privileges
    // and scheduled refresh are verified separately after installation.
    const ddl = migration.split("-- SCHEDULE:")[0]
      .replaceAll("analytics_private", schema)
      .replaceAll("public.battle", `${schema}.battle`)
      .replace(/^REVOKE ALL .*;\r?\n/gm, "");
    await client.query(ddl);
  });
  beforeEach(() => client.query(`TRUNCATE ${schema}.battle_team_participants, ${schema}.battle_logs`));
  afterAll(async () => {
    try { await client.query("ROLLBACK"); } finally { await client.end(); }
  });

  it("combines both sources, includes exact boundaries, and excludes future/untracked/unknown records", async () => {
    await client.query(`INSERT INTO ${schema}.battle_team_participants VALUES
      ('brawlBall','Test Map','SHELLY',1,'victory',now()),
      ('brawlBall','Test Map','SHELLY',1,'draw',now()-interval '7 days'),
      ('brawlBall','Test Map','SHELLY',1,'defeat',now()-interval '8 days'),
      ('brawlBall','Test Map','SHELLY',1,'victory',now()-interval '31 days'),
      ('brawlBall','Test Map','SHELLY',1,'victory',now()+interval '1 day'),
      ('brawlBall','Test Map','Unknown',1,'victory',now()),
      ('brawlBall','Test Map',null,1,'victory',now()),
      ('brawlBall','Test Map','SHELLY',1,null,now())`);
    await client.query(`INSERT INTO ${schema}.battle_logs VALUES
      ('brawlBall','Test Map','SHELLY',2,'victory',now()-interval '6 days',true),
      ('brawlBall','Test Map','SHELLY',2,'defeat',now()-interval '30 days',true),
      ('brawlBall','Test Map','SHELLY',2,'victory',now(),false)`);
    await client.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${schema}.meta_brawler_quality_snapshot`);
    const { rows } = await client.query(`SELECT *, last_battle_at=refreshed_at AS matches_snapshot_time FROM ${schema}.meta_brawler_quality_snapshot`);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ brawler_id: 2, plays: "5", wins: "2", draws: "1", recent_plays: "3", matches_snapshot_time: true });
  });

  it("keeps genuinely old samples distinguishable from a freshly updated aggregate", async () => {
    await client.query(`INSERT INTO ${schema}.battle_team_participants
      SELECT 'gemGrab','Old Map','COLT',2,'victory',now()-interval '9 days' FROM generate_series(1,50)`);
    await client.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${schema}.meta_brawler_quality_snapshot`);
    const { rows } = await client.query(`SELECT plays,recent_plays,last_battle_at<refreshed_at-interval '7 days' AS old_matches FROM ${schema}.meta_brawler_quality_snapshot`);
    expect(rows[0]).toMatchObject({ plays: "50", recent_plays: "0", old_matches: true });
  });

  it("refreshes an empty result without retaining obsolete recommendations", async () => {
    await client.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${schema}.meta_brawler_quality_snapshot`);
    expect((await client.query(`SELECT * FROM ${schema}.meta_brawler_quality_snapshot`)).rows).toEqual([]);
  });
});
