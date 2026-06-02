import { NextResponse } from "next/server";
import { saveBattleLogs } from "../../../../server/battleLogs";
import { rejectRateLimitedRequest } from "../../../../server/rateLimit";
import { fetchBrawlApi, UpstreamApiError } from "../../../../server/upstream";
import type { BattleLogResponse } from "../../../../types/brawl";
import { isValidPlayerTag, normalizePlayerTag } from "../../../../utils/playerTag";

async function loadBattleLogs(request: Request, shouldSave: boolean) {
  const rejected = rejectRateLimitedRequest(
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
    const data = await fetchBrawlApi<BattleLogResponse>(
      `/players/%23${cleanTag}/battlelog`,
      15_000,
    );
    const items = Array.isArray(data.items) ? data.items : [];

    if (shouldSave) await saveBattleLogs(cleanTag, items);
    return NextResponse.json({ ...data, items });
  } catch (error) {
    console.error("Failed to fetch or save battle logs:", error);
    const status = error instanceof UpstreamApiError ? error.status : 502;
    const message =
      error instanceof UpstreamApiError
        ? error.message
        : "전투 기록을 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: Request) {
  return loadBattleLogs(request, false);
}

export async function POST(request: Request) {
  return loadBattleLogs(request, true);
}
