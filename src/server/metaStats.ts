import { sql } from "drizzle-orm";
import { db } from "../db";

export const MINIMUM_META_PLAYS = 5;
export const MINIMUM_TEAM_PLAYS = 3;

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
    WITH team_log_candidates AS (
      SELECT
        id,
        player_tag,
        mode,
        map,
        result,
        battle_detail_json,
        battle_fingerprint,
        row_number() OVER (
          PARTITION BY coalesce(battle_fingerprint, id::text)
          ORDER BY id DESC
        ) AS duplicate_order
      FROM battle_logs
      WHERE jsonb_typeof(battle_detail_json->'battle'->'teams') = 'array'
        AND jsonb_array_length(battle_detail_json->'battle'->'teams') = 2
        AND coalesce(battle_detail_json->'battle'->>'type', '') <> 'friendly'
        AND mode NOT IN ('duoShowdown', 'trioShowdown')
    ),
    team_logs AS (
      SELECT *
      FROM team_log_candidates
      WHERE duplicate_order = 1
    ),
    team_players AS (
      SELECT
        team_logs.id,
        team_logs.player_tag,
        team_logs.map,
        team_logs.result,
        team_entry.team_index,
        player_entry.player_json,
        coalesce(player_entry.player_json->'brawler', player_entry.player_json->'brawlers'->0) AS brawler_json
      FROM team_logs
      CROSS JOIN LATERAL jsonb_array_elements(team_logs.battle_detail_json->'battle'->'teams')
        WITH ORDINALITY AS team_entry(team_json, team_index)
      CROSS JOIN LATERAL jsonb_array_elements(team_entry.team_json) AS player_entry(player_json)
    ),
    searched_teams AS (
      SELECT DISTINCT id, team_index
      FROM team_players
      WHERE regexp_replace(upper(trim(player_json->>'tag')), '^#', '') =
        regexp_replace(upper(trim(player_tag)), '^#', '')
    ),
    expanded_team_stats AS (
      SELECT
        team_players.map,
        nullif(team_players.brawler_json->>'id', '')::integer AS brawler_id,
        team_players.brawler_json->>'name' AS brawler_name,
        CASE
          WHEN team_players.result = 'draw' THEN 'draw'
          WHEN searched_teams.team_index IS NULL THEN NULL
          WHEN team_players.team_index = searched_teams.team_index THEN team_players.result
          WHEN team_players.result = 'victory' THEN 'defeat'
          WHEN team_players.result = 'defeat' THEN 'victory'
          ELSE NULL
        END AS result
      FROM team_players
      LEFT JOIN searched_teams ON searched_teams.id = team_players.id
    ),
    perspective_stats AS (
      SELECT map, brawler_id, brawler_name, result
      FROM battle_logs
      WHERE coalesce(battle_detail_json->'battle'->>'type', '') <> 'friendly'
        AND (
          battle_detail_json->'battle'->'teams' IS NULL
          OR mode IN ('duoShowdown', 'trioShowdown')
          OR jsonb_typeof(battle_detail_json->'battle'->'teams') <> 'array'
          OR jsonb_array_length(battle_detail_json->'battle'->'teams') <> 2
        )
    ),
    combined_stats AS (
      SELECT * FROM expanded_team_stats
      UNION ALL
      SELECT * FROM perspective_stats
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
  const brawlerObject = JSON.stringify({
    battle: { teams: [[{ brawler: { name: brawler } }]] },
  });
  const brawlersObject = JSON.stringify({
    battle: { teams: [[{ brawlers: [{ name: brawler }] }]] },
  });

  return sql`
    WITH team_log_candidates AS (
      SELECT
        id,
        player_tag,
        mode,
        result,
        battle_detail_json,
        battle_fingerprint,
        row_number() OVER (
          PARTITION BY coalesce(battle_fingerprint, id::text)
          ORDER BY id DESC
        ) AS duplicate_order
      FROM battle_logs
      WHERE jsonb_typeof(battle_detail_json->'battle'->'teams') = 'array'
        AND jsonb_array_length(battle_detail_json->'battle'->'teams') = 2
        AND coalesce(battle_detail_json->'battle'->>'type', '') <> 'friendly'
        AND mode NOT IN ('duoShowdown', 'trioShowdown')
        AND (
          battle_detail_json @> ${brawlerObject}::jsonb
          OR battle_detail_json @> ${brawlersObject}::jsonb
        )
    ),
    team_logs AS (
      SELECT *
      FROM team_log_candidates
      WHERE duplicate_order = 1
    ),
    team_players AS (
      SELECT
        team_logs.id,
        team_logs.player_tag,
        team_logs.result,
        team_entry.team_index,
        coalesce(player_entry.player_json->'brawler', player_entry.player_json->'brawlers'->0)->>'name' AS brawler_name,
        player_entry.player_json
      FROM team_logs
      CROSS JOIN LATERAL jsonb_array_elements(team_logs.battle_detail_json->'battle'->'teams')
        WITH ORDINALITY AS team_entry(team_json, team_index)
      CROSS JOIN LATERAL jsonb_array_elements(team_entry.team_json) AS player_entry(player_json)
    ),
    searched_teams AS (
      SELECT DISTINCT id, team_index
      FROM team_players
      WHERE regexp_replace(upper(trim(player_json->>'tag')), '^#', '') =
        regexp_replace(upper(trim(player_tag)), '^#', '')
    ),
    target_teams AS (
      SELECT DISTINCT team_players.id, team_players.team_index
      FROM team_players
      WHERE upper(team_players.brawler_name) = upper(${brawler})
    ),
    target_outcomes AS (
      SELECT
        target_teams.id,
        target_teams.team_index,
        CASE
          WHEN team_logs.result = 'draw' THEN 'draw'
          WHEN searched_teams.team_index IS NULL THEN NULL
          WHEN target_teams.team_index = searched_teams.team_index THEN team_logs.result
          WHEN team_logs.result = 'victory' THEN 'defeat'
          WHEN team_logs.result = 'defeat' THEN 'victory'
          ELSE NULL
        END AS target_result
      FROM target_teams
      JOIN team_logs ON team_logs.id = target_teams.id
      LEFT JOIN searched_teams ON searched_teams.id = target_teams.id
    ),
    opponent_rows AS (
      SELECT
        team_players.brawler_name AS brawler,
        CASE
          WHEN target_outcomes.target_result = 'draw' THEN 'draw'
          WHEN target_outcomes.target_result = 'victory' THEN 'defeat'
          WHEN target_outcomes.target_result = 'defeat' THEN 'victory'
          ELSE NULL
        END AS opponent_result
      FROM team_players
      JOIN target_outcomes ON
        target_outcomes.id = team_players.id
        AND target_outcomes.team_index <> team_players.team_index
      WHERE target_outcomes.target_result IS NOT NULL
        AND team_players.brawler_name IS NOT NULL
        AND upper(team_players.brawler_name) <> upper(${brawler})
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
    WITH team_log_candidates AS (
      SELECT
        id,
        player_tag,
        mode,
        map,
        result,
        battle_detail_json,
        battle_fingerprint,
        row_number() OVER (
          PARTITION BY coalesce(battle_fingerprint, id::text)
          ORDER BY id DESC
        ) AS duplicate_order
      FROM battle_logs
      WHERE jsonb_typeof(battle_detail_json->'battle'->'teams') = 'array'
        AND jsonb_array_length(battle_detail_json->'battle'->'teams') = 2
        AND coalesce(battle_detail_json->'battle'->>'type', '') <> 'friendly'
        AND mode NOT IN ('duoShowdown', 'trioShowdown')
        AND (${mapName} = '' OR map = ${mapName})
    ),
    team_logs AS (
      SELECT *
      FROM team_log_candidates
      WHERE duplicate_order = 1
    ),
    team_players AS (
      SELECT
        team_logs.id,
        team_logs.player_tag,
        team_logs.map,
        team_logs.result,
        team_entry.team_index,
        coalesce(player_entry.player_json->'brawler', player_entry.player_json->'brawlers'->0)->>'name' AS brawler_name,
        player_entry.player_json
      FROM team_logs
      CROSS JOIN LATERAL jsonb_array_elements(team_logs.battle_detail_json->'battle'->'teams')
        WITH ORDINALITY AS team_entry(team_json, team_index)
      CROSS JOIN LATERAL jsonb_array_elements(team_entry.team_json) AS player_entry(player_json)
    ),
    searched_teams AS (
      SELECT DISTINCT id, team_index
      FROM team_players
      WHERE regexp_replace(upper(trim(player_json->>'tag')), '^#', '') =
        regexp_replace(upper(trim(player_tag)), '^#', '')
    ),
    team_outcomes AS (
      SELECT DISTINCT
        team_players.id,
        team_players.map,
        team_players.team_index,
        CASE
          WHEN team_players.result = 'draw' THEN 'draw'
          WHEN searched_teams.team_index IS NULL THEN NULL
          WHEN team_players.team_index = searched_teams.team_index THEN team_players.result
          WHEN team_players.result = 'victory' THEN 'defeat'
          WHEN team_players.result = 'defeat' THEN 'victory'
          ELSE NULL
        END AS result
      FROM team_players
      LEFT JOIN searched_teams ON searched_teams.id = team_players.id
    ),
    battle_teams AS (
      SELECT
        team_players.id,
        team_players.map,
        team_players.team_index,
        team_outcomes.result,
        string_agg(team_players.brawler_name, ' + ' ORDER BY team_players.brawler_name) AS team
      FROM team_players
      JOIN team_outcomes ON
        team_outcomes.id = team_players.id
        AND team_outcomes.team_index = team_players.team_index
      WHERE team_players.brawler_name IS NOT NULL
        AND team_outcomes.result IS NOT NULL
      GROUP BY team_players.id, team_players.map, team_players.team_index, team_outcomes.result
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
    FROM battle_logs
    WHERE jsonb_typeof(battle_detail_json->'battle'->'teams') = 'array'
      AND jsonb_array_length(battle_detail_json->'battle'->'teams') = 2
      AND coalesce(battle_detail_json->'battle'->>'type', '') <> 'friendly'
      AND mode NOT IN ('duoShowdown', 'trioShowdown')
      AND map <> ''
    ORDER BY map
  `;
}

export async function queryTeamMaps() {
  return db.execute<TeamMapRow>(buildTeamMapsQuery());
}
