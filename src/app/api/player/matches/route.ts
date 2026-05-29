import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { battleLogs } from "../../../../db/schema";
import { isValidPlayerTag, normalizePlayerTag } from "../../../../utils/playerTag";

type BrawlerRef = {
  name: string;
};

type BattlePlayer = {
  tag: string;
  brawler?: BrawlerRef;
  brawlers?: BrawlerRef[];
};

type BattleLogItem = {
  battleTime: string;
  event: {
    mode: string;
    map: string;
  };
  battle: {
    result?: string;
    rank?: number;
    trophyChange?: number;
    teams?: BattlePlayer[][];
    players?: BattlePlayer[];
  };
};

type BattleLogResponse = {
  items?: BattleLogItem[];
};

function getPlayerBrawlerName(match: BattleLogItem, cleanTag: string) {
  const players = [
    ...(match.battle.players ?? []),
    ...(match.battle.teams ?? []).flat(),
  ];

  const player = players.find((battlePlayer) => {
    return normalizePlayerTag(battlePlayer.tag) === cleanTag;
  });

  return player?.brawler?.name ?? player?.brawlers?.[0]?.name ?? "Unknown";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");

  if (!tag || !isValidPlayerTag(tag)) {
    return NextResponse.json({ error: "태그가 없습니다." }, { status: 400 });
  }

  const apiKey = process.env.BRAWL_STARS_API_KEY;
  if (!apiKey) {
    console.error("BRAWL_STARS_API_KEY is missing.");
    return NextResponse.json(
      { error: "서버 API 설정이 없습니다." },
      { status: 500 },
    );
  }

  const cleanTag = normalizePlayerTag(tag);
  const url = `https://bsproxy.royaleapi.dev/v1/players/%23${cleanTag}/battlelog`;

  try {
    const supercellRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    const data = (await supercellRes.json()) as BattleLogResponse;

    if (!supercellRes.ok) {
      return NextResponse.json(data, { status: supercellRes.status });
    }

    if (data.items) {
      for (const match of data.items) {
        await db
          .insert(battleLogs)
          .values({
            playerTag: cleanTag,
            battleTime: match.battleTime,
            mode: match.event.mode,
            map: match.event.map,
            brawlerName: getPlayerBrawlerName(match, cleanTag),
            result: match.battle.result ?? "draw",
            rank: match.battle.rank ?? 0,
            trophyChange: match.battle.trophyChange ?? 0,
            battleDetail: JSON.stringify(match),
          })
          .onConflictDoNothing();
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch or save battle logs:", error);
    return NextResponse.json(
      { error: "서버 DB 저장 중 오류 발생" },
      { status: 500 },
    );
  }
}
