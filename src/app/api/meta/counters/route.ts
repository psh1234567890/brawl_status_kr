import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { rejectRateLimitedRequest } from "../../../../server/rateLimit";

export async function GET(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "meta-counters", {
    limit: 60,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  const { searchParams } = new URL(request.url);
  const brawler = searchParams.get("brawler") ?? "";
  if (!brawler) {
    return NextResponse.json({ error: "브롤러 이름이 필요합니다." }, { status: 400 });
  }
  if (brawler.length > 40) {
    return NextResponse.json({ error: "브롤러 이름이 너무 깁니다." }, { status: 400 });
  }

  try {
    const result = await db.execute<{
      brawler: string;
      plays: number | string;
      wins: number | string;
      winRate: number | string;
      score: number | string;
    }>(sql`
      WITH team_log_candidates AS (
        SELECT
          id,
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
      ),
      team_logs AS (
        SELECT *
        FROM team_log_candidates
        WHERE duplicate_order = 1
      ),
      team_players AS (
        SELECT
          team_logs.id,
          team_logs.result,
          team_entry.team_index,
          coalesce(player_entry.player_json->'brawler', player_entry.player_json->'brawlers'->0)->>'name' AS brawler_name
        FROM team_logs
        CROSS JOIN LATERAL jsonb_array_elements(team_logs.battle_detail_json->'battle'->'teams')
          WITH ORDINALITY AS team_entry(team_json, team_index)
        CROSS JOIN LATERAL jsonb_array_elements(team_entry.team_json) AS player_entry(player_json)
      ),
      target_teams AS (
        SELECT DISTINCT id, team_index, result
        FROM team_players
        WHERE upper(brawler_name) = upper(${brawler})
      ),
      opponent_rows AS (
        SELECT
          team_players.brawler_name AS brawler,
          CASE
            WHEN target_teams.result = 'defeat' THEN 'victory'
            WHEN target_teams.result = 'victory' THEN 'defeat'
            ELSE 'draw'
          END AS opponent_result
        FROM team_players
        JOIN target_teams ON
          target_teams.id = team_players.id
          AND target_teams.team_index <> team_players.team_index
        WHERE team_players.brawler_name IS NOT NULL
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
      HAVING count(*) >= 3
      ORDER BY score DESC, plays DESC
      LIMIT 50
    `);

    return NextResponse.json({ items: result.rows });
  } catch (error) {
    console.error("Failed to calculate counters:", error);
    return NextResponse.json({ error: "카운터 통계를 계산하지 못했습니다." }, { status: 500 });
  }
}
