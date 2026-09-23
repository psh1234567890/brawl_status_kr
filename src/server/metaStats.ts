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
  map: string;
  brawlerId: number | null;
  brawlerName: string;
  plays: number | string;
  wins: number | string;
  draws: number | string;
};

export function buildMapMetaStatsQuery(minimumPlays = MINIMUM_META_PLAYS) {
  return sql`
    WITH combined_stats AS (
      SELECT map, brawler_id, brawler_name, result
      FROM battle_team_participants
      WHERE battle_timestamp >= now() - (${META_WINDOW_DAYS} * interval '1 day')

      UNION ALL

      SELECT map, brawler_id, brawler_name, result
      FROM battle_logs
      WHERE meta_perspective_only = true
        AND battle_timestamp >= now() - (${META_WINDOW_DAYS} * interval '1 day')
    )
    SELECT
      map,
      max(brawler_id) AS "brawlerId",
      brawler_name AS "brawlerName",
      count(*) AS plays,
      sum(CASE WHEN result = 'victory' THEN 1 ELSE 0 END) AS wins,
      sum(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) AS draws
    FROM combined_stats
    WHERE result IS NOT NULL
      AND brawler_name IS NOT NULL
      AND brawler_name <> 'Unknown'
    GROUP BY map, brawler_name
    HAVING count(*) >= ${minimumPlays}
  `;
}

export async function queryMapMetaStats(minimumPlays = MINIMUM_META_PLAYS) {
  return db.execute<MapMetaRawRow>(buildMapMetaStatsQuery(minimumPlays));
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
