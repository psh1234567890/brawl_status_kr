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

// Read the private, periodically refreshed materialized aggregate, rather
// than scanning all battle rows whenever a cold server instance starts.
export function buildCachedDataStatusQuery() {
  return sql`
    SELECT "totalBattles", "uniqueBattles", players, maps, brawlers,
           "latestBattle", "popularMaps", "popularBrawlers",
           refreshed_at::text AS "refreshedAt"
    FROM analytics_private.collection_status_snapshot
    WHERE snapshot_id = 1
      AND refreshed_at >= now() - interval '45 minutes'
  `;
}

// One statement uses one connection and a consistent snapshot for all aggregates.
// Existing narrow B-tree indexes service counts; the map/brawler groups also supply totals.
// Only public battle counts are cached; account/session data never enters this cache.
export function buildDataStatusQuery() {
  return sql`
    -- Map and brawler counts come from their grouped ranking inputs.
    -- The old multi-DISTINCT aggregate forced one expensive wide index scan.
    WITH map_totals AS MATERIALIZED (
      SELECT map AS name, count(*) AS plays
      FROM battle_logs
      GROUP BY map
    ),
    brawler_totals AS MATERIALIZED (
      SELECT brawler_name AS name, count(*) AS plays
      FROM battle_logs
      WHERE brawler_name <> 'Unknown'
      GROUP BY brawler_name
    )
    SELECT
      (SELECT coalesce(sum(plays), 0) FROM map_totals) AS "totalBattles",
      (SELECT count(*) FROM (
        SELECT DISTINCT battle_fingerprint
        FROM battle_logs
        WHERE battle_fingerprint IS NOT NULL
      ) unique_fingerprints) AS "uniqueBattles",
      (SELECT count(*) FROM (
        SELECT DISTINCT player_tag
        FROM battle_logs
        WHERE player_tag IS NOT NULL
      ) unique_players) AS players,
      (SELECT count(*) FROM map_totals WHERE name IS NOT NULL) AS maps,
      (SELECT count(*) FROM brawler_totals WHERE name IS NOT NULL) AS brawlers,
      (SELECT max(battle_timestamp)::text FROM battle_logs) AS "latestBattle",
      coalesce((
        SELECT jsonb_agg(popular_maps ORDER BY plays DESC, name ASC)
        FROM (
          SELECT name, plays FROM map_totals
          ORDER BY plays DESC, name ASC LIMIT 10
        ) popular_maps
      ), '[]'::jsonb) AS "popularMaps",
      coalesce((
        SELECT jsonb_agg(popular_brawlers ORDER BY plays DESC, name ASC)
        FROM (
          SELECT name, plays FROM brawler_totals
          ORDER BY plays DESC, name ASC LIMIT 10
        ) popular_brawlers
      ), '[]'::jsonb) AS "popularBrawlers"
  `;
}

let pendingRead: Promise<DataStatus> | null = null;
let lastSuccessfulRead: DataStatus | null = null;
let retryAfter = 0;
const STALE_SNAPSHOT_MAX_MS = 60 * 60_000;
const FAILED_REFRESH_COOLDOWN_MS = 30_000;
async function readDataStatus(): Promise<DataStatus> {
  if (pendingRead) return pendingRead;
  pendingRead = observeServerOperation("db.status.summary", async () => {
    const result = await db.execute<StatusRow & { refreshedAt?: string }>(buildCachedDataStatusQuery());
    const summary = result.rows[0];
    if (!summary) throw new Error("Missing data status aggregate");
    const { refreshedAt } = summary;
    const snapshot = { summary, sampledAt: refreshedAt ?? new Date().toISOString() };
    lastSuccessfulRead = snapshot;
    retryAfter = 0;
    return snapshot;
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
const readCachedDataStatus = unstable_cache(readDataStatus, ["public-data-status-v4-precomputed"], {
  // A collection-status snapshot can refresh less often than active match data.
  revalidate: 900,
});

export async function getDataStatus(): Promise<DataStatus | null> {
  const isRecent = () => lastSuccessfulRead !== null &&
    Date.now() - Date.parse(lastSuccessfulRead.sampledAt) < STALE_SNAPSHOT_MAX_MS;
  if (isRecent() && Date.now() < retryAfter) return lastSuccessfulRead;
  try {
    const snapshot = await readCachedDataStatus();
    lastSuccessfulRead = snapshot;
    retryAfter = 0;
    return snapshot;
  } catch {
    // A failed refresh never writes zeros to the shared cache.
    // Serve a bounded last-known-good sample within this instance on an outage.
    retryAfter = Date.now() + FAILED_REFRESH_COOLDOWN_MS;
    if (isRecent()) {
      return lastSuccessfulRead;
    }
    return null;
  }
}
