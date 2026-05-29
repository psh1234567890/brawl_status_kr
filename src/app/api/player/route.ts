import { NextResponse } from "next/server";
import { isValidPlayerTag, normalizePlayerTag } from "../../../utils/playerTag";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerTag = searchParams.get("tag");

  if (!playerTag || !isValidPlayerTag(playerTag)) {
    return NextResponse.json(
      { error: "플레이어 태그가 필요합니다." },
      { status: 400 },
    );
  }

  const apiKey = process.env.BRAWL_STARS_API_KEY;
  if (!apiKey) {
    console.error("BRAWL_STARS_API_KEY is missing.");
    return NextResponse.json(
      { error: "서버 API 설정이 없습니다." },
      { status: 500 },
    );
  }

  const cleanTag = normalizePlayerTag(playerTag);
  const url = `https://bsproxy.royaleapi.dev/v1/players/%23${cleanTag}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "프로필 데이터를 불러오는 데 실패했습니다." },
        { status: response.status },
      );
    }

    const data: unknown = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch player profile:", error);
    return NextResponse.json(
      { error: "서버와 연결할 수 없습니다." },
      { status: 502 },
    );
  }
}
