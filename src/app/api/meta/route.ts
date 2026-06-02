import { NextResponse } from "next/server";
import { db } from "../../../db";
import { battleLogs } from "../../../db/schema";
import { sql } from "drizzle-orm";

type BrawlerMapStat = {
  id?: number;
  name: string;
  plays: number;
  wins: number;
  winRate: number;
  score: number;
};

type MapStatsResponse = Record<string, BrawlerMapStat[]>;

type BattleBrawler = {
  id?: number;
  name?: string;
};

type BattlePlayer = {
  brawler?: BattleBrawler;
  brawlers?: BattleBrawler[];
};

type BattleDetail = {
  battle?: {
    players?: BattlePlayer[];
    teams?: BattlePlayer[][];
  };
};

function collectBrawlerIds(detail: string, brawlerIds: Map<string, number>) {
  try {
    const match = JSON.parse(detail) as BattleDetail;
    const players = [
      ...(match.battle?.players ?? []),
      ...(match.battle?.teams ?? []).flat(),
    ];

    for (const player of players) {
      const brawlers = [
        ...(player.brawler ? [player.brawler] : []),
        ...(player.brawlers ?? []),
      ];

      for (const brawler of brawlers) {
        if (brawler.name && brawler.id && !brawlerIds.has(brawler.name)) {
          brawlerIds.set(brawler.name, brawler.id);
        }
      }
    }
  } catch {
    // Ignore malformed legacy details and keep serving the remaining stats.
  }
}

export async function GET() {
  try {
    const [rows, detailRows] = await Promise.all([
      db
      .select({
        map: battleLogs.map,
        brawlerName: battleLogs.brawlerName,
        plays: sql<number>`count(*)`,
        wins: sql<number>`sum(case when ${battleLogs.result} = 'victory' then 1 else 0 end)`,
      })
      .from(battleLogs)
      .groupBy(battleLogs.map, battleLogs.brawlerName),
      db
        .selectDistinctOn([battleLogs.brawlerName], {
          detail: battleLogs.battleDetail,
        })
        .from(battleLogs),
    ]);

    const finalResult: MapStatsResponse = {};
    const brawlerIds = new Map<string, number>();

    for (const row of detailRows) {
      collectBrawlerIds(row.detail, brawlerIds);
    }

    for (const row of rows) {
      const plays = Number(row.plays);
      const wins = Number(row.wins);
      const winRate = plays > 0 ? Math.floor((wins / plays) * 100) : 0;
      const score = Math.floor((winRate * plays) / (plays + 5));

      if (!finalResult[row.map]) {
        finalResult[row.map] = [];
      }

      finalResult[row.map].push({
        id: brawlerIds.get(row.brawlerName),
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
