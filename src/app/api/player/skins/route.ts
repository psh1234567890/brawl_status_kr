import { NextResponse } from "next/server";
import { withApiMonitoring } from "../../../../server/observability";
import { fetchPlayerSkinInventory } from "../../../../server/playerSkinInventory";
import { rejectRateLimitedRequest } from "../../../../server/rateLimit";
import { UpstreamApiError } from "../../../../server/upstream";
import { isValidPlayerTag } from "../../../../utils/playerTag";

async function getPlayerSkins(request: Request) {
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
    return NextResponse.json(await fetchPlayerSkinInventory(tag));
  } catch (error) {
    console.error("Failed to fetch player skin inventory:", error);
    const status = error instanceof UpstreamApiError ? error.status : 502;
    return NextResponse.json(
      { error: "스킨 정보를 불러오지 못했습니다." },
      { status },
    );
  }
}

export const GET = withApiMonitoring("api.player.skins", getPlayerSkins, { slowMs: 1_500 });
