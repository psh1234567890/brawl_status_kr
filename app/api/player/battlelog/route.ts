import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerTag = searchParams.get("tag");

  if (!playerTag) {
    return NextResponse.json(
      {
        error: "플레이어 태그가 필요합니다.",
      },
      {
        status: 400,
      },
    );
  }

  const apiKey = process.env.BRAWL_STARS_API_KEY;
  const cleanTag = playerTag.replace("#", "").toUpperCase();

  // 유저 정보 주소 뒤에 /battlelog 를 붙이는 게 핵심이야!
  const url = `https://api.brawlstars.com/v1/players/%23${cleanTag}/battlelog`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "전투 기록을 가져올 수 없습니다. 태그를 확인해주세요.",
      },
      {
        status: 404,
      },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
