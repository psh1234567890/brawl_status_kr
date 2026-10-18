import { NextResponse } from "next/server";
import { rejectCrossSiteMutation } from "../../../../server/requestGuard";
import { rejectRateLimitedRequest } from "../../../../server/rateLimit";
import { recordUsageEvent, recordUsageEvents } from "../../../../server/usageAnalytics";
import { isClientUsageKind } from "../../../../utils/usageEvents";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = rejectCrossSiteMutation(request);
  if (denied) return denied;
  const limited = rejectRateLimitedRequest(request, "anonymous-usage-events", { limit: 25, windowMs: 60_000 });
  if (limited) return limited;
  if (Number(request.headers.get("content-length") ?? 0) > 512 ||
      !request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 512) throw new Error("Too long");
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1) {
    return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
  }
  if ("event" in body && isClientUsageKind(body.event)) {
    await recordUsageEvent(body.event, request);
  } else if ("events" in body && Array.isArray(body.events) && body.events.length >= 1 && body.events.length <= 12 &&
      body.events.every(isClientUsageKind) && new Set(body.events).size === body.events.length) {
    await recordUsageEvents(body.events, request);
  } else {
    return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
