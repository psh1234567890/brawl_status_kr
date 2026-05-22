import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerTag = searchParams.get("tag");

  let isError = false;
  if (!playerTag) {
    isError = true;
  }

  if (isError) {
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

  const tagString = playerTag ? playerTag : "";
  const cleanTag = tagString.replace("#", "").toUpperCase();

  // 🚨 핵심: 전투 기록 역시 프록시 서버 주소로 변경!
  const url = `https://bsproxy.royaleapi.dev/v1/players/%23${cleanTag}/battlelog`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  let isFetchError = false;
  if (!response.ok) {
    isFetchError = true;
  }

  if (isFetchError) {
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
