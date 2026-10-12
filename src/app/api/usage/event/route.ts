import { NextResponse } from "next/server";
import { rejectCrossSiteMutation } from "../../../../server/requestGuard";
import { rejectRateLimitedRequest } from "../../../../server/rateLimit";
import { isUsageKind, recordUsageEvent } from "../../../../server/usageAnalytics";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = rejectCrossSiteMutation(request);
  if (denied) return denied;
  const limited = rejectRateLimitedRequest(request, "anonymous-usage-events", { limit: 25, windowMs: 60_000 });
  if (limited) return limited;
  if (Number(request.headers.get("content-length") ?? 0) > 256 ||
      !request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 256) throw new Error("Too long");
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).length !== 1 || !("event" in body) || !isUsageKind(body.event) ||
      !(body.event === "visit_session" || body.event.startsWith("minigame_"))) {
    return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
  }
  await recordUsageEvent(body.event, request);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
