import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "../../../db";
import { battleLogs } from "../../../db/schema";
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
    const rows = await db
      .select({
        map: battleLogs.map,
        brawlerId: sql<number | null>`max(${battleLogs.brawlerId})`,
        brawlerName: battleLogs.brawlerName,
        plays: sql<number>`count(*)`,
        wins: sql<number>`sum(case when ${battleLogs.result} = 'victory' then 1 else 0 end)`,
      })
      .from(battleLogs)
      .groupBy(battleLogs.map, battleLogs.brawlerName)
      .having(sql`count(*) >= ${MINIMUM_PLAYS}`);

    const result: MapStatsResponse = {};
    for (const row of rows) {
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
