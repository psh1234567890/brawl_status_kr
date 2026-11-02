import { NextResponse } from "next/server";
import { DraftInputError, getDraftOptions, parseDraftInput, recommendDraft } from "../../../server/draftRecommendation";
import { rejectRateLimitedRequest } from "../../../server/rateLimit";

export async function GET() {
  return NextResponse.json(getDraftOptions(), { headers: { "Cache-Control": "public, max-age=3600" } });
}

export async function POST(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "draft-recommendation", { limit: 90, windowMs: 60_000 });
  if (rejected) return rejected;
  try {
    const body = await request.text();
    if (body.length > 16_384) return NextResponse.json({ error: "입력 크기가 너무 큽니다." }, { status: 413 });
    const input = parseDraftInput(JSON.parse(body));
    const started = performance.now();
    const result = recommendDraft(input);
    return NextResponse.json({ ...result, inferenceMs: performance.now() - started },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DraftInputError || error instanceof SyntaxError) {
      return NextResponse.json({ error: error instanceof DraftInputError ? error.message : "입력 형식을 확인해 주세요." }, { status: 400 });
    }
    console.error("Draft recommendation failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "추천을 계산하지 못했습니다. 다시 시도해 주세요." }, { status: 500 });
  }
}
