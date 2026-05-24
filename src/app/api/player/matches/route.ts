import { NextResponse } from "next/server";
import { db } from "../../../../db"; // 방금 만든 DB 연결 파일 불러오기
import { battleLogs } from "../../../../db/schema"; // 우리가 짠 설계도 불러오기

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");

  if (!tag) {
    return NextResponse.json({ error: "태그가 없습니다." }, { status: 400 });
  }

  try {
    // 1. 기존처럼 슈퍼셀 API 호출
    const cleanTag = tag.replace("#", "");
    const supercellRes = await fetch(
      `https://api.brawlstars.com/v1/players/%23${cleanTag}/battlelog`,
      {
        headers: {
          // 기장님이 기존에 쓰던 환경 변수 이름으로 맞춰주면 돼!
          Authorization: `Bearer ${process.env.BRAWL_API_KEY}`,
        },
      },
    );

    const data = await supercellRes.json();

    if (!supercellRes.ok) {
      return NextResponse.json(data, { status: supercellRes.status });
    }

    // 2. ✨ 여기가 핵심! 받아온 데이터를 우리 DB에 밀어넣기
    if (data.items) {
      for (let i = 0; i < data.items.length; i = i + 1) {
        const match = data.items[i];
        let myBrawlerName = "Unknown";

        // 팀전 모드일 때 내 브롤러 이름 찾기 (중첩 if문으로 && 연산자 완벽 회피!)
        if (match.battle.teams) {
          match.battle.teams.forEach((team: any) => {
            team.forEach((p: any) => {
              const pTag = p.tag.replace("#", "");
              if (pTag === cleanTag) {
                myBrawlerName = p.brawler.name;
              }
            });
          });
        }

        // 쇼다운 모드일 때 내 브롤러 이름 찾기
        if (match.battle.players) {
          match.battle.players.forEach((p: any) => {
            const pTag = p.tag.replace("#", "");
            if (pTag === cleanTag) {
              myBrawlerName = p.brawler.name;
            }
          });
        }

        // Drizzle을 사용한 안전한 인서트 로직!
        await db
          .insert(battleLogs)
          .values({
            playerTag: tag,
            battleTime: match.battleTime,
            mode: match.event.mode,
            map: match.event.map,
            brawlerName: myBrawlerName,
            // 값이 없을 경우를 대비한 삼항 연산자 방어 로직
            result: match.battle.result ? match.battle.result : "draw",
            rank: match.battle.rank ? match.battle.rank : 0,
            trophyChange: match.battle.trophyChange
              ? match.battle.trophyChange
              : 0,
            battleDetail: JSON.stringify(match),
          })
          .onConflictDoNothing(); // 중복 데이터(태그+시간)면 에러 없이 패스!
      }
    }

    // 3. 프론트엔드로는 원래 주던 대로 25판 데이터 그대로 응답해주기
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "서버 DB 저장 중 에러 발생" },
      { status: 500 },
    );
  }
}
