import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { battleLogs } from "../../../../db/schema";
import { isValidPlayerTag, normalizePlayerTag } from "../../../../utils/playerTag";
import { inArray, sql } from "drizzle-orm";

type BrawlerStat = {
  name: string;
  plays: number;
  wins: number;
  winRate: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");

  if (!tag || !isValidPlayerTag(tag)) {
    return NextResponse.json({ error: "태그가 필요합니다." }, { status: 400 });
  }

  try {
    const cleanTag = normalizePlayerTag(tag);
    const tagVariants = Array.from(new Set([tag, cleanTag]));

    const rows = await db
      .select({
        name: battleLogs.brawlerName,
        plays: sql<number>`count(*)`,
        wins: sql<number>`sum(case when ${battleLogs.result} = 'victory' then 1 else 0 end)`,
      })
      .from(battleLogs)
      .where(inArray(battleLogs.playerTag, tagVariants))
      .groupBy(battleLogs.brawlerName);

    const resultList: BrawlerStat[] = rows
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
      .sort((a, b) => b.winRate - a.winRate);

    const totalGames = resultList.reduce((total, stat) => total + stat.plays, 0);

    return NextResponse.json({
      totalGames,
      brawlers: resultList,
    });
  } catch (error) {
    console.error("Failed to calculate player DB stats:", error);
    return NextResponse.json({ error: "DB 통계 계산 실패" }, { status: 500 });
  }
}
