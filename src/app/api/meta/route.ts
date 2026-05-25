import { NextResponse } from "next/server";
import { db } from "../../../db"; 
import { battleLogs } from "../../../db/schema"; 

export async function GET(request: Request) 
{
    try 
    {
        // 1. 우리 Supabase DB에 있는 '모든' 전투 기록 가져오기!
        const allLogs = await db.select().from(battleLogs);

        // 2. 맵 -> 브롤러 -> 통계(판수, 승수)를 저장할 빈 객체
        const mapStats: any = {};

        // 3. 모든 데이터를 돌면서 판수와 승수 누적하기
        for (let i = 0; i < allLogs.length; i = i + 1) 
        {
            const log = allLogs[i];
            const mapName = log.map;
            const brawler = log.brawlerName;
            const result = log.result;

            let isValid = false;
            // 동아리 규칙 적용: 논리 연산자 회피를 위해 중첩 if문 사용
            if (mapName) 
            {
                if (brawler) 
                {
                    isValid = true;
                }
            }

            if (isValid) 
            {
                if (!mapStats[mapName]) 
                {
                    mapStats[mapName] = {};
                }

                if (!mapStats[mapName][brawler]) 
                {
                    mapStats[mapName][brawler] = { plays: 0, wins: 0 };
                }

                // 판수 1 증가
                mapStats[mapName][brawler].plays = mapStats[mapName][brawler].plays + 1;

                // 승리했을 경우 승수 1 증가
                if (result === "victory") 
                {
                    mapStats[mapName][brawler].wins = mapStats[mapName][brawler].wins + 1;
                }
            }
        }

        // 4. 누적된 데이터를 프론트엔드가 쓰기 좋게 배열로 예쁘게 포장하기
        const finalResult: any = {};
        const mapKeys = Object.keys(mapStats);

        for (let j = 0; j < mapKeys.length; j = j + 1) 
        {
            const currentMap = mapKeys[j];
            const brawlersInMap = mapStats[currentMap];
            const brawlerKeys = Object.keys(brawlersInMap);
            
            const brawlerArray = [];

            for (let k = 0; k < brawlerKeys.length; k = k + 1) 
            {
                const currentBrawler = brawlerKeys[k];
                const stats = brawlersInMap[currentBrawler];
                
                let winRate = 0;
                if (stats.plays > 0) 
                {
                    winRate = Math.floor((stats.wins / stats.plays) * 100);
                }

                // 가중 점수 (최소 5판 기준 베이지안 평균 느낌으로 단순화)
                const score = Math.floor((winRate * stats.plays) / (stats.plays + 5));

                brawlerArray.push(
                {
                    name: currentBrawler,
                    plays: stats.plays,
                    wins: stats.wins,
                    winRate: winRate,
                    score: score
                });
            }

            // 가중 점수(score)가 높은 순서대로 내림차순 정렬
            brawlerArray.sort((a: any, b: any) => 
            {
                return b.score - a.score;
            });

            finalResult[currentMap] = brawlerArray;
        }

        return NextResponse.json(finalResult);
    } 
    catch (error) 
    {
        console.error("=== 🚨 [메타 통계 에러] 🚨 ===");
        console.error(error);
        return NextResponse.json({ error: "통계 계산 중 에러 발생" }, { status: 500 });
    }
}