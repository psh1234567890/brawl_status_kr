import { NextResponse } from "next/server";
import { fetchBrawlaceSkinInventory } from "../../../../server/brawlaceSkins";
import { rejectRateLimitedRequest } from "../../../../server/rateLimit";
import { isValidPlayerTag } from "../../../../utils/playerTag";

export async function GET(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "player-skins", {
    limit: 20,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");
  if (!tag || !isValidPlayerTag(tag)) {
    return NextResponse.json({ error: "올바른 플레이어 태그가 필요합니다." }, { status: 400 });
  }

  try {
    return NextResponse.json(await fetchBrawlaceSkinInventory(tag));
  } catch (error) {
    console.error("Failed to fetch player skins:", error);
    return NextResponse.json(
      { error: "보유 스킨 목록을 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}
