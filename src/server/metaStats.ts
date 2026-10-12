import { sql } from "drizzle-orm";
import { db } from "../db";
import { META_WINDOW_DAYS } from "../constants/meta";

export const MINIMUM_META_PLAYS = 5;
export const MINIMUM_TEAM_PLAYS = 3;
export { META_WINDOW_DAYS };

type CounterRow = {
  brawler: string;
  plays: number | string;
  wins: number | string;
  winRate: number | string;
  score: number | string;
};

type TeamCompRow = {
  map: string;
  team: string;
  plays: number | string;
  wins: number | string;
  winRate: number | string;
  score: number | string;
};

type TeamMapRow = {
  map: string;
};

export type MapMetaRawRow = {
  mode: string;
  map: string;
  brawlerId: number | null;
  brawlerName: string;
  plays: number | string;
  wins: number | string;
  draws: number | string;
};

export class MetaSnapshotUnavailableError extends Error {
  constructor() {
    super("Meta snapshot refresh is overdue");
    this.name = "MetaSnapshotUnavailableError";
  }
}

export function assertMetaSnapshotFresh(refreshedAt: string) {
  const timestamp = Date.parse(refreshedAt);
  if (!Number.isFinite(timestamp) || timestamp < Date.now() - 45 * 60_000) {
    throw new MetaSnapshotUnavailableError();
  }
}

export function buildMapMetaStatsQuery(minimumPlays = MINIMUM_META_PLAYS) {
  return sql`
    -- Pre-aggregate each source before UNION ALL to avoid grouping ~100k raw rows
    -- together. Sum source counts to preserve the original combined sample.
    WITH source_totals AS (
      SELECT
        mode, map, brawler_name,
        max(brawler_id) AS brawler_id,
        count(*) AS plays,
        count(*) FILTER (WHERE result = 'victory') AS wins,
        count(*) FILTER (WHERE result = 'draw') AS draws
      FROM battle_team_participants
      WHERE battle_timestamp >= now() - (${META_WINDOW_DAYS} * interval '1 day')
        AND result IS NOT NULL
        AND brawler_name IS NOT NULL
        AND brawler_name <> 'Unknown'
      GROUP BY mode, map, brawler_name

      UNION ALL

      SELECT
        mode, map, brawler_name,
        max(brawler_id) AS brawler_id,
        count(*) AS plays,
        count(*) FILTER (WHERE result = 'victory') AS wins,
        count(*) FILTER (WHERE result = 'draw') AS draws
      FROM battle_logs
      WHERE meta_perspective_only = true
        AND battle_timestamp >= now() - (${META_WINDOW_DAYS} * interval '1 day')
        AND result IS NOT NULL
        AND brawler_name IS NOT NULL
        AND brawler_name <> 'Unknown'
      GROUP BY mode, map, brawler_name
    )
    SELECT
      mode,
      map,
      max(brawler_id) AS "brawlerId",
      brawler_name AS "brawlerName",
      sum(plays) AS plays,
      sum(wins) AS wins,
      sum(draws) AS draws
    FROM source_totals
    GROUP BY mode, map, brawler_name
    HAVING sum(plays) >= ${minimumPlays}
  `;
}

export async function queryMapMetaStats(minimumPlays = MINIMUM_META_PLAYS) {
  // Pre-aggregated 30-day snapshot refreshed by pg_cron. This avoids a full
  // participant+perspective scan on every cold function invocation.
  const result = await db.execute<MapMetaRawRow & { refreshedAt: string }>(sql`
    SELECT mode, map, brawler_id AS "brawlerId", brawler_name AS "brawlerName",
           plays, wins, draws, refreshed_at::text AS "refreshedAt"
    FROM analytics_private.meta_brawler_snapshot
    WHERE plays >= ${minimumPlays}
  `);
  // Inspect freshness instead of filtering overdue rows into a successful empty
  // result. A genuinely empty sample remains empty; stale statistics are errors.
  for (const row of result.rows) assertMetaSnapshotFresh(row.refreshedAt);
  return result;
}

export function buildCounterStatsQuery(brawler: string) {
  return sql`
    WITH target_teams AS (
      SELECT DISTINCT battle_fingerprint, team_index
      FROM battle_team_participants
      WHERE battle_timestamp >= now() - (${META_WINDOW_DAYS} * interval '1 day')
        AND brawler_name = ${brawler}
    ),
    opponent_rows AS (
      SELECT
        participants.brawler_name AS brawler,
        participants.result AS opponent_result
      FROM battle_team_participants AS participants
      JOIN target_teams ON
        target_teams.battle_fingerprint = participants.battle_fingerprint
        AND target_teams.team_index <> participants.team_index
      WHERE participants.battle_timestamp >= now() - (${META_WINDOW_DAYS} * interval '1 day')
        AND participants.brawler_name IS NOT NULL
        AND participants.brawler_name <> ${brawler}
    )
    SELECT
      brawler,
      count(*) AS plays,
      sum(CASE WHEN opponent_result = 'victory' THEN 1 ELSE 0 END) AS wins,
      floor((sum(CASE WHEN opponent_result = 'victory' THEN 1 ELSE 0 END)::numeric / count(*)) * 100) AS "winRate",
      floor(((sum(CASE WHEN opponent_result = 'victory' THEN 1 ELSE 0 END)::numeric / count(*)) * 100) * count(*) / (count(*) + 3)) AS score
    FROM opponent_rows
    GROUP BY brawler
    HAVING count(*) >= ${MINIMUM_TEAM_PLAYS}
    ORDER BY score DESC, plays DESC
    LIMIT 50
  `;
}

export async function queryCounterStats(brawler: string) {
  return db.execute<CounterRow>(buildCounterStatsQuery(brawler));
}

export function buildTeamCompStatsQuery(mapName: string) {
  return sql`
    WITH battle_teams AS (
      SELECT
        battle_fingerprint,
        map,
        team_index,
        result,
        string_agg(brawler_name, ' + ' ORDER BY brawler_name) AS team
      FROM battle_team_participants
      WHERE battle_timestamp >= now() - (${META_WINDOW_DAYS} * interval '1 day')
        AND (${mapName} = '' OR map = ${mapName})
        AND brawler_name IS NOT NULL
      GROUP BY battle_fingerprint, map, team_index, result
      HAVING count(*) >= 2
    )
    SELECT
      map,
      team,
      count(*) AS plays,
      sum(CASE WHEN result = 'victory' THEN 1 ELSE 0 END) AS wins,
      floor((sum(CASE WHEN result = 'victory' THEN 1 ELSE 0 END)::numeric / count(*)) * 100) AS "winRate",
      floor(((sum(CASE WHEN result = 'victory' THEN 1 ELSE 0 END)::numeric / count(*)) * 100) * count(*) / (count(*) + 3)) AS score
    FROM battle_teams
    GROUP BY map, team
    HAVING count(*) >= ${MINIMUM_TEAM_PLAYS}
    ORDER BY score DESC, plays DESC
    LIMIT 80
  `;
}

export async function queryTeamCompStats(mapName: string) {
  return db.execute<TeamCompRow>(buildTeamCompStatsQuery(mapName));
}

export function buildTeamMapsQuery() {
  return sql`
    SELECT DISTINCT map
    FROM battle_team_participants
    WHERE battle_timestamp >= now() - (${META_WINDOW_DAYS} * interval '1 day')
      AND map <> ''
    ORDER BY map
  `;
}

export async function queryTeamMaps() {
  return db.execute<TeamMapRow>(buildTeamMapsQuery());
}
