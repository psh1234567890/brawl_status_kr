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

  // 유저가 '#'을 빼거나 소문자로 입력해도 알아서 처리되게끔 다듬기
  const cleanTag = playerTag.replace("#", "").toUpperCase();
  const url = `https://api.brawlstars.com/v1/players/%23${cleanTag}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "플레이어 정보를 찾을 수 없습니다. 태그를 확인해주세요.",
      },
      {
        status: 404,
      },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
