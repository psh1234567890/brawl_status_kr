import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "../../../db";
import { rejectRateLimitedRequest } from "../../../server/rateLimit";

const MINIMUM_PLAYS = 5;

type BrawlerMapStat = {
  id?: number;
  name: string;
  plays: number;
  wins: number;
  winRate: number;
  score: number;
};

type MapStatsResponse = Record<string, BrawlerMapStat[]>;

const getCachedMetaStats = unstable_cache(
  async () => {
    const queryResult = await db.execute<{
      map: string;
      brawlerId: number | null;
      brawlerName: string;
      plays: number | string;
      wins: number | string;
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
        LEFT JOIN searched_teams ON
          searched_teams.id = team_players.id
      ),
      perspective_stats AS (
        SELECT map, brawler_id, brawler_name, result
        FROM battle_logs
        WHERE battle_detail_json->'battle'->'teams' IS NULL
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
        sum(CASE WHEN result = 'victory' THEN 1 ELSE 0 END) AS wins
      FROM combined_stats
      WHERE result IS NOT NULL
        AND brawler_name IS NOT NULL
        AND brawler_name <> 'Unknown'
      GROUP BY map, brawler_name
      HAVING count(*) >= ${MINIMUM_PLAYS}
    `);

    const result: MapStatsResponse = {};
    for (const row of queryResult.rows) {
      if (row.brawlerName === "Unknown") continue;

      const plays = Number(row.plays);
      const wins = Number(row.wins);
      const winRate = plays > 0 ? Math.floor((wins / plays) * 100) : 0;
      const score = Math.floor((winRate * plays) / (plays + MINIMUM_PLAYS));

      result[row.map] ??= [];
      result[row.map].push({
        id: row.brawlerId ?? undefined,
        name: row.brawlerName,
        plays,
        wins,
        winRate,
        score,
      });
    }

    for (const mapName of Object.keys(result)) {
      result[mapName].sort((left, right) => right.score - left.score);
    }
    return result;
  },
  ["meta-stats-v2"],
  { revalidate: 60, tags: ["meta-stats"] },
);

export async function GET(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "meta", {
    limit: 90,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  try {
    return NextResponse.json(await getCachedMetaStats());
  } catch (error) {
    console.error("Failed to calculate meta stats:", error);
    return NextResponse.json(
      { error: "메타 통계를 계산하지 못했습니다." },
      { status: 500 },
    );
  }
}
