import { NextResponse } from "next/server";
import { getEventRotation } from "../../../server/eventRotation";
import { withApiMonitoring } from "../../../server/observability";
import { rejectRateLimitedRequest } from "../../../server/rateLimit";
import { rejectSharedPublicRateLimit } from "../../../server/sharedPublicRateLimit";

export const runtime = "nodejs";

async function getEvents(request: Request) {
  const limited = rejectRateLimitedRequest(request, "event-rotation", {
    limit: 60, windowMs: 60_000,
  });
  if (limited) return limited;
  const sharedLimited = await rejectSharedPublicRateLimit(request, "public-event-rotation", 60);
  if (sharedLimited) return sharedLimited;

  try {
    return NextResponse.json(await getEventRotation(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.warn(JSON.stringify({
      event: "event_rotation_unavailable",
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json(
      { error: "현재 맵을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export const GET = withApiMonitoring("api.events", getEvents);
