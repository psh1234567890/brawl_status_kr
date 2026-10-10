import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import { PgDialect } from "drizzle-orm/pg-core";
vi.mock("server-only", () => ({}));
vi.mock("../db", () => ({ db: {} }));
import { buildDataStatusQuery } from "./dataStatus";

const testUrl = process.env.DATA_STATUS_TEST_DATABASE_URL;
// Explicit disposable local DB only; never fall back to DATABASE_URL or .env.local.
if (testUrl) {
  let safe = false;
  try {
    const url = new URL(testUrl);
    safe = ["postgres:", "postgresql:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && url.pathname.endsWith("_test");
  } catch { /* Do not expose a credential-bearing URL parser error. */ }
  if (!safe) throw new Error("Data-status integration requires an explicit local disposable *_test database.");
}

describe.skipIf(!testUrl)("data-status PostgreSQL aggregates", () => {
  const client = new Client({ connectionString: testUrl, ssl: false });
  const query = new PgDialect().sqlToQuery(buildDataStatusQuery());
  beforeAll(async () => {
    await client.connect();
    await client.query("BEGIN");
    // Temp table shadows any public table; the test never writes to the application's schema.
    await client.query(`CREATE TEMP TABLE battle_logs (
      battle_fingerprint text, player_tag text, map text, brawler_name text, battle_timestamp timestamptz
    ) ON COMMIT DROP`);
  });
  beforeEach(() => client.query("TRUNCATE pg_temp.battle_logs"));
  afterAll(async () => {
    try { await client.query("ROLLBACK"); } finally { await client.end(); }
  });

  it("returns real zeros and empty lists for an empty table", async () => {
    const row = (await client.query(query.sql, query.params)).rows[0];
    expect(Number(row.totalBattles)).toBe(0);
    expect(row.latestBattle).toBeNull();
    expect(row.popularMaps).toEqual([]);
    expect(row.popularBrawlers).toEqual([]);
  });

  it("preserves duplicate/null fingerprint counting and excludes Unknown brawlers", async () => {
    await client.query(`INSERT INTO pg_temp.battle_logs VALUES
      ('a', 'tag1', 'Map A', 'SHELLY', '2026-10-10T00:00:00Z'),
      ('a', 'tag2', 'Map A', 'COLT', '2026-10-10T00:00:00Z'),
      ('b', 'tag1', 'Map B', 'SHELLY', '2026-10-09T00:00:00Z'),
      ('c', 'tag3', 'Map B', 'Unknown', '2026-10-08T00:00:00Z'),
      (NULL, 'tag4', 'Map C', 'Unknown', NULL)`);
    const row = (await client.query(query.sql, query.params)).rows[0];
    expect([row.totalBattles, row.uniqueBattles, row.players, row.maps, row.brawlers].map(Number)).toEqual([5, 3, 4, 3, 2]);
    expect(row.popularMaps).toEqual([{ name: "Map A", plays: 2 }, { name: "Map B", plays: 2 }, { name: "Map C", plays: 1 }]);
    expect(row.popularBrawlers).toEqual([{ name: "SHELLY", plays: 2 }, { name: "COLT", plays: 1 }]);
    expect(new Date(row.latestBattle).toISOString()).toBe("2026-10-10T00:00:00.000Z");
  });

  it("limits both rankings to ten rows with deterministic tie ordering", async () => {
    await client.query(`INSERT INTO pg_temp.battle_logs
      SELECT i::text, 'tag', 'Map ' || lpad(i::text, 2, '0'), 'Brawler ' || lpad(i::text, 2, '0'), now()
      FROM generate_series(1, 20) i`);
    const row = (await client.query(query.sql, query.params)).rows[0];
    expect(row.popularMaps).toHaveLength(10);
    expect(row.popularMaps[0].name).toBe("Map 01");
    expect(row.popularMaps[9].name).toBe("Map 10");
    expect(row.popularBrawlers).toHaveLength(10);
    expect(row.popularBrawlers[9].name).toBe("Brawler 10");
  });
});
