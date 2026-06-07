import { and, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { battleLogs } from "../../../../db/schema";
import { rejectRateLimitedRequest } from "../../../../server/rateLimit";
import type { BrawlerStat } from "../../../../types/brawl";
import { isValidPlayerTag, normalizePlayerTag } from "../../../../utils/playerTag";

export async function GET(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "player-db-stats", {
    limit: 60,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");
  if (!tag || !isValidPlayerTag(tag)) {
    return NextResponse.json(
      { error: "올바른 플레이어 태그가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const cleanTag = normalizePlayerTag(tag);
    const tagVariants = Array.from(new Set([tag, cleanTag, `#${cleanTag}`]));
    const rows = await db
      .select({
        name: battleLogs.brawlerName,
        plays: sql<number>`count(*)`,
        wins: sql<number>`sum(case when ${battleLogs.result} = 'victory' then 1 else 0 end)`,
      })
      .from(battleLogs)
      .where(
        and(
          inArray(battleLogs.playerTag, tagVariants),
          sql`coalesce(${battleLogs.battleDetailJson}->'battle'->>'type', '') <> 'friendly'`,
        ),
      )
      .groupBy(battleLogs.brawlerName);

    const brawlers: BrawlerStat[] = rows
      .map((row) => {
        const plays = Number(row.plays);
        const wins = Number(row.wins);
        return {
          name: row.name,
          plays,
          wins,
          winRate: plays > 0 ? Math.floor((wins / plays) * 100) : 0,
        };
      })
      .sort((left, right) => right.winRate - left.winRate);

    return NextResponse.json({
      totalGames: brawlers.reduce((total, stat) => total + stat.plays, 0),
      brawlers,
    });
  } catch (error) {
    console.error("Failed to calculate player DB stats:", error);
    return NextResponse.json({ error: "DB 통계 계산에 실패했습니다." }, { status: 500 });
  }
}
