import { and, desc, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { battleLogs } from "../../../../db/schema";
import { rejectRateLimitedRequest } from "../../../../server/rateLimit";
import { rejectCrossSiteMutation } from "../../../../server/requestGuard";
import type {
  PlayerHistoryBucket,
  PlayerHistoryDay,
  PlayerHistoryResponse,
} from "../../../../types/brawl";
import { isValidPlayerTag, normalizePlayerTag } from "../../../../utils/playerTag";

function getTagVariants(tag: string) {
  const cleanTag = normalizePlayerTag(tag);
  return Array.from(new Set([tag, cleanTag, `#${cleanTag}`]));
}

function getBaseWhere(tag: string) {
  return and(
    inArray(battleLogs.playerTag, getTagVariants(tag)),
    sql`${battleLogs.battleTimestamp} IS NOT NULL`,
    sql`coalesce(${battleLogs.battleDetailJson}->'battle'->>'type', '') <> 'friendly'`,
  );
}

export async function GET(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "player-history", {
    limit: 60,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");
  if (!tag || !isValidPlayerTag(tag)) {
    return NextResponse.json({ error: "올바른 플레이어 태그가 필요합니다." }, { status: 400 });
  }

  try {
    const dayExpr = sql<string>`to_char(${battleLogs.battleTimestamp} AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')`;
    const baseWhere = getBaseWhere(tag);

    const [dailyRows, modeRows, mapRows] = await Promise.all([
      db
        .select({
          day: dayExpr,
          plays: sql<number>`count(*)`,
          wins: sql<number>`sum(case when ${battleLogs.result} = 'victory' then 1 else 0 end)`,
          defeats: sql<number>`sum(case when ${battleLogs.result} = 'defeat' then 1 else 0 end)`,
          draws: sql<number>`sum(case when ${battleLogs.result} = 'draw' then 1 else 0 end)`,
          trophyDelta: sql<number>`coalesce(sum(${battleLogs.trophyChange}), 0)`,
        })
        .from(battleLogs)
        .where(baseWhere)
        .groupBy(dayExpr)
        .orderBy(desc(dayExpr))
        .limit(60),
      db
        .select({
          name: battleLogs.mode,
          plays: sql<number>`count(*)`,
          wins: sql<number>`sum(case when ${battleLogs.result} = 'victory' then 1 else 0 end)`,
          trophyDelta: sql<number>`coalesce(sum(${battleLogs.trophyChange}), 0)`,
        })
        .from(battleLogs)
        .where(baseWhere)
        .groupBy(battleLogs.mode)
        .orderBy(desc(sql<number>`count(*)`))
        .limit(8),
      db
        .select({
          name: battleLogs.map,
          plays: sql<number>`count(*)`,
          wins: sql<number>`sum(case when ${battleLogs.result} = 'victory' then 1 else 0 end)`,
          trophyDelta: sql<number>`coalesce(sum(${battleLogs.trophyChange}), 0)`,
        })
        .from(battleLogs)
        .where(baseWhere)
        .groupBy(battleLogs.map)
        .orderBy(desc(sql<number>`count(*)`))
        .limit(8),
    ]);

    const daily: PlayerHistoryDay[] = dailyRows.map((row) => ({
      day: row.day,
      plays: Number(row.plays),
      wins: Number(row.wins),
      defeats: Number(row.defeats),
      draws: Number(row.draws),
      trophyDelta: Number(row.trophyDelta),
    }));

    const toBucket = (row: { name: string; plays: number | string; wins: number | string; trophyDelta: number | string }): PlayerHistoryBucket => {
      const plays = Number(row.plays);
      const wins = Number(row.wins);
      return {
        name: row.name,
        plays,
        wins,
        winRate: plays > 0 ? Math.floor((wins / plays) * 100) : 0,
        trophyDelta: Number(row.trophyDelta),
      };
    };

    const response: PlayerHistoryResponse = {
      totalTrackedGames: daily.reduce((total, row) => total + row.plays, 0),
      daily,
      topModes: modeRows.map(toBucket),
      topMaps: mapRows.map(toBucket),
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to calculate player history:", error);
    return NextResponse.json({ error: "장기 기록을 계산하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const crossSiteRejected = rejectCrossSiteMutation(request);
  if (crossSiteRejected) return crossSiteRejected;

  const rejected = rejectRateLimitedRequest(request, "player-history-delete", {
    limit: 6,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");
  if (!tag || !isValidPlayerTag(tag)) {
    return NextResponse.json({ error: "올바른 플레이어 태그가 필요합니다." }, { status: 400 });
  }

  try {
    const deletedRows = await db
      .delete(battleLogs)
      .where(inArray(battleLogs.playerTag, getTagVariants(tag)))
      .returning({ id: battleLogs.id });
    return NextResponse.json({ deleted: deletedRows.length });
  } catch (error) {
    console.error("Failed to delete player history:", error);
    return NextResponse.json({ error: "저장된 기록을 삭제하지 못했습니다." }, { status: 500 });
  }
}
