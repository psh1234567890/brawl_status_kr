import { NextResponse } from "next/server";
import { saveBattleLogs } from "../../../../server/battleLogs";
import { rejectRateLimitedRequest } from "../../../../server/rateLimit";
import { rejectCrossSiteMutation } from "../../../../server/requestGuard";
import { rejectSharedPublicRateLimit } from "../../../../server/sharedPublicRateLimit";
import { withApiMonitoring } from "../../../../server/observability";
import { fetchBrawlApiSnapshot, UpstreamApiError } from "../../../../server/upstream";
import type { BattleLogResponse } from "../../../../types/brawl";
import { isValidPlayerTag, normalizePlayerTag } from "../../../../utils/playerTag";

async function loadBattleLogs(request: Request, shouldSave: boolean, locallyLimited = false) {
  const rejected = locallyLimited ? null : rejectRateLimitedRequest(
    request,
    shouldSave ? "player-matches-save" : "player-matches-read",
    { limit: shouldSave ? 15 : 40, windowMs: 60_000 },
  );
  if (rejected) return rejected;

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");
  if (!tag || !isValidPlayerTag(tag)) {
    return NextResponse.json(
      { error: "올바른 플레이어 태그가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const cleanTag = normalizePlayerTag(tag);
    const { data, freshness } = await fetchBrawlApiSnapshot<BattleLogResponse>(
      `/players/%23${cleanTag}/battlelog`,
      15_000, 2 * 60_000,
    );
    const items = Array.isArray(data.items) ? data.items : [];

    let storageStatus: BattleLogResponse["storageStatus"];
    if (shouldSave) {
      storageStatus = freshness.status === "stale" ? "skipped-stale" : "saved";
      if (freshness.status !== "stale") {
        try {
          await saveBattleLogs(cleanTag, items);
        } catch (error) {
          storageStatus = "unavailable";
          console.warn(JSON.stringify({
            event: "battle_log_save_failed", errorName: error instanceof Error ? error.name : "UnknownError",
          }));
        }
      }
    }
    return NextResponse.json({ ...data, items, dataFreshness: freshness, storageStatus }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof UpstreamApiError ? error.status : 502;
    const message =
      error instanceof UpstreamApiError
        ? error.message
        : "전투 기록을 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}

export const GET = withApiMonitoring("api.player.matches.read", (request) => loadBattleLogs(request, false));

export const POST = withApiMonitoring("api.player.matches.save", async (request) => {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  // Reject bursts locally before spending a database round-trip on the shared limit.
  const localLimited = rejectRateLimitedRequest(request, "player-matches-save", {
    limit: 15, windowMs: 60_000,
  });
  if (localLimited) return localLimited;

  // In addition to the inexpensive local guard above, protect database writes
  // across concurrent serverless instances.
  const sharedLimited = await rejectSharedPublicRateLimit(request, "public-matches-save", 15);
  if (sharedLimited) return sharedLimited;

  return loadBattleLogs(request, true, true);
});
