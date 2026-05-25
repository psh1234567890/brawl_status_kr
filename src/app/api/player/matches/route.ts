import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { battleLogs } from "../../../../db/schema";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");

  let isMissingTag = false;
  if (!tag) {
    isMissingTag = true;
  }

  if (isMissingTag) {
    return NextResponse.json({ error: "태그가 없습니다." }, { status: 400 });
  }

  try {
    const apiKey = process.env.BRAWL_STARS_API_KEY;
    const tagString = tag ? tag : "";
    const cleanTag = tagString.replace("#", "").toUpperCase();

    const url = `https://bsproxy.royaleapi.dev/v1/players/%23${cleanTag}/battlelog`;

    const supercellRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    const data = await supercellRes.json();

    let isFetchError = false;
    if (!supercellRes.ok) {
      isFetchError = true;
    }

    if (isFetchError) {
      return NextResponse.json(data, { status: supercellRes.status });
    }

    if (data.items) {
      for (let i = 0; i < data.items.length; i = i + 1) {
        const match = data.items[i];
        let myBrawlerName = "Unknown";

        if (match.battle.teams) {
          match.battle.teams.forEach((team: any) => {
            team.forEach((p: any) => {
              const pTag = p.tag.replace("#", "");
              if (pTag === cleanTag) {
                // ✨ 방어 로직: brawler가 있으면 그거 쓰고, 없으면 brawlers 배열 검사
                if (p.brawler) {
                  myBrawlerName = p.brawler.name;
                } else if (p.brawlers) {
                  if (p.brawlers.length > 0) {
                    myBrawlerName = p.brawlers[0].name;
                  }
                }
              }
            });
          });
        }

        if (match.battle.players) {
          match.battle.players.forEach((p: any) => {
            const pTag = p.tag.replace("#", "");
            if (pTag === cleanTag) {
              // ✨ 쇼다운 모드 등에서도 똑같이 방어!
              if (p.brawler) {
                myBrawlerName = p.brawler.name;
              } else if (p.brawlers) {
                if (p.brawlers.length > 0) {
                  myBrawlerName = p.brawlers[0].name;
                }
              }
            }
          });
        }

        const finalResult = match.battle.result ? match.battle.result : "draw";
        const finalRank = match.battle.rank ? match.battle.rank : 0;
        const finalTrophyChange = match.battle.trophyChange
          ? match.battle.trophyChange
          : 0;

        await db
          .insert(battleLogs)
          .values({
            playerTag: tagString,
            battleTime: match.battleTime,
            mode: match.event.mode,
            map: match.event.map,
            brawlerName: myBrawlerName,
            result: finalResult,
            rank: finalRank,
            trophyChange: finalTrophyChange,
            battleDetail: JSON.stringify(match),
          })
          .onConflictDoNothing();
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("=== 🚨 [DB 에러 상세 원인] 🚨 ===");
    console.error(error);
    return NextResponse.json(
      { error: "서버 DB 저장 중 에러 발생" },
      { status: 500 },
    );
  }
}
