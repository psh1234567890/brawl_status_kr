import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("../db", () => ({ db: {} }));
import { buildMapMetaStatsQuery } from "./metaStats";

const testUrl = process.env.DATA_STATUS_TEST_DATABASE_URL;
// Same disposable local PostgreSQL used by CI's data-status integration tests.
// Never use the app's production DATABASE_URL, nor write permanent tables.
if (testUrl) {
  let safe = false;
  try {
    const url = new URL(testUrl);
    safe = ["postgres:", "postgresql:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      url.pathname.endsWith("_test");
  } catch { /* Avoid logging credential-bearing parse errors. */ }
  if (!safe) throw new Error("Meta integration requires a local disposable *_test database.");
}

const baselineSql = `
  WITH combined_stats AS (
    SELECT mode, map, brawler_id, brawler_name, result FROM battle_team_participants
    WHERE battle_timestamp >= now() - interval '30 days'
    UNION ALL
    SELECT mode, map, brawler_id, brawler_name, result FROM battle_logs
    WHERE meta_perspective_only = true AND battle_timestamp >= now() - interval '30 days'
  )
  SELECT mode, map, max(brawler_id) AS "brawlerId",
    brawler_name AS "brawlerName", count(*) AS plays,
    sum(CASE WHEN result = 'victory' THEN 1 ELSE 0 END) AS wins,
    sum(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) AS draws
  FROM combined_stats
  WHERE result IS NOT NULL AND brawler_name IS NOT NULL AND brawler_name <> 'Unknown'
  GROUP BY mode, map, brawler_name HAVING count(*) >= 5
`;

function ordered(rows: Record<string, unknown>[]) {
  return rows.map((row) => JSON.stringify(row)).sort();
}

describe.skipIf(!testUrl)("map meta pre-aggregation on disposable PostgreSQL", () => {
  const client = new Client({ connectionString: testUrl, ssl: false });
  const query = new PgDialect().sqlToQuery(buildMapMetaStatsQuery(5));

  beforeAll(async () => {
    await client.connect();
    await client.query("BEGIN");
    await client.query(`CREATE TEMP TABLE battle_team_participants (
      mode text, map text, brawler_id integer, brawler_name text, result text,
      battle_timestamp timestamptz
    ) ON COMMIT DROP`);
    await client.query(`CREATE TEMP TABLE battle_logs (
      mode text, map text, brawler_id integer, brawler_name text, result text,
      battle_timestamp timestamptz, meta_perspective_only boolean
    ) ON COMMIT DROP`);
  });

  beforeEach(async () => {
    await client.query("TRUNCATE pg_temp.battle_team_participants, pg_temp.battle_logs");
  });
  afterAll(async () => {
    try { await client.query("ROLLBACK"); } finally { await client.end(); }
  });

  it("returns no meta rows when both sources are empty", async () => {
    const result = await client.query(query.sql, query.params);
    expect(result.rows).toEqual([]);
  });

  it("matches the original SQL exactly, including source merges, exclusions and max IDs", async () => {
    await client.query(`INSERT INTO pg_temp.battle_team_participants
      SELECT 'brawlBall', 'Test Map', 16000000, 'SHELLY',
        CASE WHEN n <= 3 THEN 'victory' WHEN n = 4 THEN 'draw' ELSE 'defeat' END,
        now() FROM generate_series(1, 5) n`);
    await client.query(`INSERT INTO pg_temp.battle_logs
      SELECT 'brawlBall', 'Test Map', 16000001, 'SHELLY',
        CASE WHEN n = 1 THEN 'victory' ELSE 'draw' END,
        now(), true FROM generate_series(1, 2) n`);
    await client.query(`INSERT INTO pg_temp.battle_team_participants
      SELECT 'brawlBall', 'Test Map', 16000002, 'COLT', 'victory', now()
      FROM generate_series(1, 2)`);
    await client.query(`INSERT INTO pg_temp.battle_logs
      SELECT 'brawlBall', 'Test Map', 16000002, 'COLT', 'defeat', now(), true
      FROM generate_series(1, 3)`);
    await client.query(`INSERT INTO pg_temp.battle_team_participants
      SELECT 'brawlBall', 'Test Map', 1, 'Unknown', 'victory', now()
      FROM generate_series(1, 7)`);
    await client.query(`INSERT INTO pg_temp.battle_team_participants VALUES
      ('brawlBall', 'Test Map', 3, 'SHELLY', NULL, now()),
      ('brawlBall', 'Test Map', 3, NULL, 'victory', now()),
      ('brawlBall', 'Test Map', 3, 'SHELLY', 'victory', now() - interval '60 days')`);
    await client.query(`INSERT INTO pg_temp.battle_logs
      SELECT 'brawlBall', 'Test Map', 16000002, 'COLT', 'victory', now(), false
      FROM generate_series(1, 6)`);

    const original = (await client.query(baselineSql)).rows;
    const improved = (await client.query(query.sql, query.params)).rows;
    expect(ordered(improved)).toEqual(ordered(original));
    expect(improved).toHaveLength(2);
    expect(improved.find((row) => row.brawlerName === "SHELLY")).toMatchObject({
      brawlerId: 16000001, plays: "7", wins: "4", draws: "2",
    });
    expect(improved.find((row) => row.brawlerName === "COLT")).toMatchObject({
      brawlerId: 16000002, plays: "5", wins: "2", draws: "0",
    });
  });

  it("applies the minimum sample after combining different sources", async () => {
    await client.query(`INSERT INTO pg_temp.battle_team_participants
      SELECT 'gemGrab', 'Second Map', 9, 'PIPER', 'victory', now()
      FROM generate_series(1, 2)`);
    await client.query(`INSERT INTO pg_temp.battle_logs
      SELECT 'gemGrab', 'Second Map', 9, 'PIPER', 'draw', now(), true
      FROM generate_series(1, 3)`);
    await client.query(`INSERT INTO pg_temp.battle_team_participants
      SELECT 'gemGrab', 'Third Map', 7, 'COLT', 'victory', now()
      FROM generate_series(1, 4)`);
    const result = await client.query(query.sql, query.params);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      mode: "gemGrab", map: "Second Map", brawlerName: "PIPER",
      plays: "5", wins: "2", draws: "3",
    });
  });
});
