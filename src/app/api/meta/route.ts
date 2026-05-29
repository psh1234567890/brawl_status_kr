import { NextResponse } from "next/server";
import { db } from "../../../db";
import { battleLogs } from "../../../db/schema";
import { sql } from "drizzle-orm";

type BrawlerMapStat = {
  name: string;
  plays: number;
  wins: number;
  winRate: number;
  score: number;
};

type MapStatsResponse = Record<string, BrawlerMapStat[]>;

export async function GET() {
  try {
    const rows = await db
      .select({
        map: battleLogs.map,
        brawlerName: battleLogs.brawlerName,
        plays: sql<number>`count(*)`,
        wins: sql<number>`sum(case when ${battleLogs.result} = 'victory' then 1 else 0 end)`,
      })
      .from(battleLogs)
      .groupBy(battleLogs.map, battleLogs.brawlerName);

    const finalResult: MapStatsResponse = {};

    for (const row of rows) {
      const plays = Number(row.plays);
      const wins = Number(row.wins);
      const winRate = plays > 0 ? Math.floor((wins / plays) * 100) : 0;
      const score = Math.floor((winRate * plays) / (plays + 5));

      if (!finalResult[row.map]) {
        finalResult[row.map] = [];
      }

      finalResult[row.map].push({
        name: row.brawlerName,
        plays,
        wins,
        winRate,
        score,
      });
    }

    for (const mapName of Object.keys(finalResult)) {
      finalResult[mapName].sort((a, b) => b.score - a.score);
    }

    return NextResponse.json(finalResult);
  } catch (error) {
    console.error("Failed to calculate meta stats:", error);
    return NextResponse.json({ error: "통계 계산 중 오류 발생" }, { status: 500 });
  }
}
