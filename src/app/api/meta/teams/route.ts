import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { rejectRateLimitedRequest } from "../../../../server/rateLimit";

export async function GET(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "meta-teams", {
    limit: 60,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  const { searchParams } = new URL(request.url);
  const mapName = searchParams.get("map") ?? "";

  try {
    const result = await db.execute<{
      map: string;
      team: string;
      plays: number | string;
      wins: number | string;
      winRate: number | string;
      score: number | string;
    }>(sql`
      WITH team_log_candidates AS (
        SELECT
          id,
          player_tag,
          map,
          result,
          battle_detail_json,
          battle_fingerprint,
          row_number() OVER (
            PARTITION BY coalesce(battle_fingerprint, id::text)
            ORDER BY id DESC
          ) AS duplicate_order
        FROM battle_logs
        WHERE battle_detail_json->'battle'->'teams' IS NOT NULL
          AND coalesce(battle_detail_json->'battle'->>'type', '') <> 'friendly'
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
      searched_team_players AS (
        SELECT
          team_players.id,
          team_players.map,
          team_players.result,
          team_players.team_index,
          team_players.brawler_name
        FROM team_players
        JOIN searched_teams ON
          searched_teams.id = team_players.id
          AND searched_teams.team_index = team_players.team_index
        WHERE team_players.brawler_name IS NOT NULL
      ),
      battle_teams AS (
        SELECT
          id,
          map,
          result,
          string_agg(brawler_name, ' + ' ORDER BY brawler_name) AS team
        FROM searched_team_players
        GROUP BY id, map, result, team_index
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
      HAVING count(*) >= 3
      ORDER BY score DESC, plays DESC
      LIMIT 80
    `);

    return NextResponse.json({ items: result.rows });
  } catch (error) {
    console.error("Failed to calculate team comps:", error);
    return NextResponse.json({ error: "팀 조합 통계를 계산하지 못했습니다." }, { status: 500 });
  }
}
