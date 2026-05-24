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

  const url = `https://bsproxy.royaleapi.dev/v1/players/%23${cleanTag}`;

  // 🚨 여기서부터 진짜 범인을 잡기 위한 터미널 로그 출력!
  console.log("=== [프록시 서버 디버깅 시작] ===");
  console.log("1. 요청 URL:", url);

  let keyStatus = "없음(undefined)";
  if (apiKey) {
    keyStatus = "정상 로드됨 (앞부분: " + apiKey.substring(0, 15) + "...)";
  }
  console.log("2. API 키 상태:", keyStatus);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  console.log("3. 프록시 서버 응답 코드:", response.status);

  let isFetchError = false;
  if (!response.ok) {
    isFetchError = true;
  }

  if (isFetchError) {
    // 에러가 났을 때 프록시 서버가 뱉은 진짜 텍스트를 터미널에 출력!
    const errorText = await response.text();
    console.log("🚨 4. 프록시 에러 원문:", errorText);

    return NextResponse.json(
      {
        error: "에러 발생! VS Code 터미널 로그를 확인해주세요.",
      },
      {
        status: response.status,
      },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
