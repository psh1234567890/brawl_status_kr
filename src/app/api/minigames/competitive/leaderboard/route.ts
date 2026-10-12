import { NextResponse } from "next/server";
import { parseCompetitiveGame, parseRankingPeriod, readCompetitiveLeaderboard } from "../../../../../server/competitiveComparison";
import { AccountError } from "../../../../../server/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "public, max-age=15", "X-Robots-Tag": "noindex" };
  try {
    const params = new URL(request.url).searchParams;
    const gameId = parseCompetitiveGame(params.get("game"));
    const period = parseRankingPeriod(params.get("period"));
    const items = await readCompetitiveLeaderboard(gameId, period);
    return NextResponse.json({ gameId, period, items }, { headers });
  } catch (error) {
    const status = error instanceof AccountError ? error.status : 503;
    return NextResponse.json({ error: status === 400 ? "INVALID_REQUEST" : "LEADERBOARD_UNAVAILABLE" }, { status, headers });
  }
}
