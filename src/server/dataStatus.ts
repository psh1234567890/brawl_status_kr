import "server-only";
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { observeServerOperation } from "./observability";

export type PopularRow = { name: string; plays: number | string };
type StatusRow = {
  totalBattles: number | string;
  uniqueBattles: number | string;
  players: number | string;
  maps: number | string;
  brawlers: number | string;
  latestBattle: string | null;
  popularMaps: PopularRow[];
  popularBrawlers: PopularRow[];
};
export type DataStatus = { summary: StatusRow; sampledAt: string };

// One statement uses one connection and a consistent snapshot for all three aggregates.
// Only public battle counts are cached; account/session data never enters this cache.
export function buildDataStatusQuery() {
  return sql`
    WITH summary AS (
      SELECT count(*) AS "totalBattles",
        count(DISTINCT battle_fingerprint) AS "uniqueBattles",
        count(DISTINCT player_tag) AS players,
        count(DISTINCT map) AS maps,
        count(DISTINCT brawler_name) FILTER (WHERE brawler_name <> 'Unknown') AS brawlers,
        max(battle_timestamp)::text AS "latestBattle"
      FROM battle_logs
    ), popular_maps AS (
      SELECT map AS name, count(*) AS plays FROM battle_logs
      GROUP BY map ORDER BY plays DESC, name ASC LIMIT 10
    ), popular_brawlers AS (
      SELECT brawler_name AS name, count(*) AS plays FROM battle_logs
      WHERE brawler_name <> 'Unknown'
      GROUP BY brawler_name ORDER BY plays DESC, name ASC LIMIT 10
    )
    SELECT summary.*,
      coalesce((SELECT jsonb_agg(popular_maps ORDER BY plays DESC, name ASC) FROM popular_maps), '[]'::jsonb) AS "popularMaps",
      coalesce((SELECT jsonb_agg(popular_brawlers ORDER BY plays DESC, name ASC) FROM popular_brawlers), '[]'::jsonb) AS "popularBrawlers"
    FROM summary
  `;
}

let pendingRead: Promise<DataStatus> | null = null;
async function readDataStatus(): Promise<DataStatus> {
  if (pendingRead) return pendingRead;
  pendingRead = observeServerOperation("db.status.summary", async () => {
    const result = await db.execute<StatusRow>(buildDataStatusQuery());
    const summary = result.rows[0];
    if (!summary) throw new Error("Missing data status aggregate");
    return { summary, sampledAt: new Date().toISOString() };
  }).catch(() => {
    // Every coalesced caller must see a sanitized failure, including background refreshes.
    throw new Error("Data status query unavailable");
  });
  try {
    return await pendingRead;
  } finally {
    pendingRead = null;
  }
}

// This repo uses the Next.js caching model without Cache Components.
const readCachedDataStatus = unstable_cache(readDataStatus, ["public-data-status-v1"], {
  revalidate: 300,
});

export async function getDataStatus(): Promise<DataStatus | null> {
  try {
    return await readCachedDataStatus();
  } catch {
    // A failure is thrown inside the cache, so it cannot become a cached zero-count result.
    return null;
  }
}
