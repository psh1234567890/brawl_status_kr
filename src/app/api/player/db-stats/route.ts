import { NextResponse } from "next/server";
import { db } from "../../../../db"; 
import { battleLogs } from "../../../../db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) 
{
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get("tag");

    if (!tag) 
    {
        return NextResponse.json({ error: "태그가 필요합니다." }, { status: 400 });
    }

    try 
    {
        // 1. 우리 DB에서 이 플레이어의 모든 기록 가져오기
        const playerLogs = await db.select().from(battleLogs).where(eq(battleLogs.playerTag, tag));

        // 2. 브롤러별로 묶어서 계산할 객체
        const brawlerStats: any = {};

        for (let i = 0; i < playerLogs.length; i = i + 1) 
        {
            const log = playerLogs[i];
            const bName = log.brawlerName;
            const res = log.result;

            if (bName) 
            {
                if (!brawlerStats[bName]) 
                {
                    brawlerStats[bName] = { plays: 0, wins: 0 };
                }

                brawlerStats[bName].plays = brawlerStats[bName].plays + 1;

                if (res === "victory") 
                {
                    brawlerStats[bName].wins = brawlerStats[bName].wins + 1;
                }
            }
        }

        // 3. 브롤러별 승률 계산해서 배열로 변환
        const resultList = [];
        const bNames = Object.keys(brawlerStats);

        for (let j = 0; j < bNames.length; j = j + 1) 
        {
            const name = bNames[j];
            const stats = brawlerStats[name];
            const winRate = Math.floor((stats.wins / stats.plays) * 100);

            resultList.push({
                name: name,
                plays: stats.plays,
                wins: stats.wins,
                winRate: winRate
            });
        }

        // 승률 높은 순서로 정렬
        resultList.sort((a, b) => b.winRate - a.winRate);

        return NextResponse.json({
            totalGames: playerLogs.length,
            brawlers: resultList
        });
    } 
    catch (error) 
    {
        return NextResponse.json({ error: "DB 통계 계산 실패" }, { status: 500 });
    }
}