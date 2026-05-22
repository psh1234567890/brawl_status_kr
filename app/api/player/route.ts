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

  // 네가 작성한 환경변수 이름 그대로 살렸어! (Vercel 세팅이랑 이름 똑같은지 꼭 확인해!)
  const apiKey = process.env.BRAWL_STARS_API_KEY;

  const tagString = playerTag ? playerTag : "";
  const cleanTag = tagString.replace("#", "").toUpperCase();

  // 🚨 핵심: 공식 API 대신 RoyaleAPI 프록시 서버 주소로 변경!
  const url = `https://bsproxy.royaleapi.dev/v1/players/%23${cleanTag}`;

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
