import { NextResponse } from "next/server";
import { rejectRateLimitedRequest } from "../../../server/rateLimit";
import { rejectSharedPublicRateLimit } from "../../../server/sharedPublicRateLimit";
import { withApiMonitoring } from "../../../server/observability";
import { classifyPlayerSearchFailure, recordUsageEvent } from "../../../server/usageAnalytics";
import { recordSearchTag } from "../../../server/searchTagAnalytics";
import { fetchBrawlApiSnapshot, UpstreamApiError } from "../../../server/upstream";
import type { PlayerData } from "../../../types/brawl";
import { isValidPlayerTag, normalizePlayerTag } from "../../../utils/playerTag";

async function getPlayer(request: Request) {
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
  const sharedLimited = await rejectSharedPublicRateLimit(request, "public-player-profile", 40);
  if (sharedLimited) return sharedLimited;

  try {
    const cleanTag = normalizePlayerTag(playerTag);
    const { data, freshness } = await fetchBrawlApiSnapshot<PlayerData>(
      `/players/%23${cleanTag}`, 30_000, 5 * 60_000,
      { retryOnNetworkError: true },
    );
    // Independent, best-effort aggregates must not serialize database roundtrips.
    await Promise.all([
      recordUsageEvent("player_search_success", request),
      recordSearchTag(cleanTag, request),
    ]);
    return NextResponse.json({ ...data, dataFreshness: freshness }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof UpstreamApiError ? error.status : 502;
    const message =
      error instanceof UpstreamApiError
        ? error.message
        : "서버와 연결할 수 없습니다.";
    await Promise.all([
      recordUsageEvent("player_search_error", request),
      recordUsageEvent(classifyPlayerSearchFailure(status), request),
    ]);
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}

export const GET = withApiMonitoring("api.player", getPlayer, { slowMs: 1_500 });
