import { NextResponse } from "next/server";
import { rejectRateLimitedRequest } from "../../../server/rateLimit";
import { fetchBrawlApi, UpstreamApiError } from "../../../server/upstream";
import type { PlayerData } from "../../../types/brawl";
import { isValidPlayerTag, normalizePlayerTag } from "../../../utils/playerTag";

export async function GET(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "player-profile", {
    limit: 40,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  const { searchParams } = new URL(request.url);
  const playerTag = searchParams.get("tag");
  if (!playerTag || !isValidPlayerTag(playerTag)) {
    return NextResponse.json(
      { error: "올바른 플레이어 태그가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const cleanTag = normalizePlayerTag(playerTag);
    const data = await fetchBrawlApi<PlayerData>(`/players/%23${cleanTag}`, 30_000);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch player profile:", error);
    const status = error instanceof UpstreamApiError ? error.status : 502;
    const message =
      error instanceof UpstreamApiError
        ? error.message
        : "서버와 연결할 수 없습니다.";
    return NextResponse.json({ error: message }, { status });
  }
}
