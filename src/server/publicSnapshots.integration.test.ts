import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("../db", () => ({ db: {} }));
import { buildDataStatusQuery } from "./dataStatus";
import { buildMapMetaStatsQuery } from "./metaStats";

const testUrl = process.env.DATA_STATUS_TEST_DATABASE_URL;
if (testUrl) {
  let safe = false;
  try {
    const url = new URL(testUrl);
    safe = ["postgres:", "postgresql:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      url.pathname.endsWith("_test");
  } catch { /* Never fall back to the production database. */ }
  if (!safe) throw new Error("Snapshot integration requires a disposable local *_test database.");
}

describe.skipIf(!testUrl)("materialized public snapshots in isolated PostgreSQL", () => {
  const client = new Client({ connectionString: testUrl, ssl: false });
  const dialect = new PgDialect();

  beforeAll(async () => {
    await client.connect();
    await client.query("BEGIN");
    await client.query("CREATE SCHEMA analytics_private");
    await client.query(`CREATE TABLE public.battle_logs (
      mode text NOT NULL, map text NOT NULL, brawler_name text NOT NULL,
      brawler_id integer, result text, battle_timestamp timestamptz,
      battle_fingerprint text, player_tag text, meta_perspective_only boolean
    )`);
    await client.query(`CREATE TABLE public.battle_team_participants (
      mode text NOT NULL, map text NOT NULL, brawler_name text NOT NULL,
      brawler_id integer, result text, battle_timestamp timestamptz
    )`);
    await client.query(`INSERT INTO public.battle_team_participants
      SELECT 'brawlBall','Test Map','SHELLY',16000000,'victory',now()
      FROM generate_series(1,3)`);
    await client.query(`INSERT INTO public.battle_logs
      VALUES ('brawlBall','Test Map','SHELLY',16000000,'draw',now(),'battle1','TAG1',true),
             ('brawlBall','Test Map','SHELLY',16000000,'victory',now(),'battle1','TAG2',true)`);
    const migration = readFileSync(resolve(process.cwd(), "drizzle/0012_preaggregated_public_stats.sql"), "utf8");
    await client.query(migration.split("REVOKE ALL ON analytics_private.meta_brawler_snapshot")[0]);
  });

  afterAll(async () => {
    try { await client.query("ROLLBACK"); } finally { await client.end(); }
  });

  it("matches original 30-day meta aggregates without counting duplicate battle perspectives incorrectly", async () => {
    const { sql, params } = dialect.sqlToQuery(buildMapMetaStatsQuery(5));
    const original = (await client.query(sql, params)).rows;
    const materialized = (await client.query(`SELECT mode, map, brawler_id AS "brawlerId",
      brawler_name AS "brawlerName", plays, wins, draws
      FROM analytics_private.meta_brawler_snapshot WHERE plays >= 5`)).rows;
    expect(materialized).toEqual(original);
    expect(materialized[0]).toMatchObject({ plays: "5", wins: "4", draws: "1" });
  });

  it("matches original collection totals and retains the snapshot after source changes until refresh", async () => {
    const { sql, params } = dialect.sqlToQuery(buildDataStatusQuery());
    const original = (await client.query(sql, params)).rows[0];
    const snapshot = (await client.query("SELECT * FROM analytics_private.collection_status_snapshot")).rows[0];
    for (const key of ["totalBattles", "uniqueBattles", "players", "maps", "brawlers", "latestBattle", "popularMaps", "popularBrawlers"]) {
      expect(snapshot[key]).toEqual(original[key]);
    }
    await client.query(`INSERT INTO public.battle_logs VALUES
      ('brawlBall','Another Map','COLT',16000001,'victory',now(),'battle2','TAG3',true)`);
    const unchanged = (await client.query('SELECT "totalBattles" FROM analytics_private.collection_status_snapshot')).rows[0];
    expect(unchanged.totalBattles).toBe("2");
    await client.query("REFRESH MATERIALIZED VIEW analytics_private.collection_status_snapshot");
    const refreshed = (await client.query('SELECT "totalBattles" FROM analytics_private.collection_status_snapshot')).rows[0];
    expect(refreshed.totalBattles).toBe("3");
  });
});
