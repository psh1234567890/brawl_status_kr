import { NextResponse } from "next/server";
import { rejectRateLimitedRequest } from "../../../server/rateLimit";
import { fetchBrawlApi, UpstreamApiError } from "../../../server/upstream";
import type { RankingsResponse } from "../../../types/brawl";

const rankingTypes = new Set(["players", "clubs", "brawlers"]);

export async function GET(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "rankings", {
    limit: 60,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "players";
  const country = (searchParams.get("country") ?? "global").toLowerCase();
  const brawlerId = searchParams.get("brawlerId");

  if (!rankingTypes.has(type)) {
    return NextResponse.json({ error: "지원하지 않는 랭킹 종류입니다." }, { status: 400 });
  }
  if (!/^[a-z]{2}$|^global$/.test(country)) {
    return NextResponse.json({ error: "국가 코드는 KR 또는 global 형식이어야 합니다." }, { status: 400 });
  }
  if (type === "brawlers" && !brawlerId) {
    return NextResponse.json({ error: "브롤러 랭킹에는 브롤러 ID가 필요합니다." }, { status: 400 });
  }
  if (type === "brawlers" && !/^\d+$/.test(String(brawlerId))) {
    return NextResponse.json({ error: "브롤러 ID는 숫자여야 합니다." }, { status: 400 });
  }

  const path =
    type === "brawlers"
      ? `/rankings/${country}/brawlers/${encodeURIComponent(String(brawlerId))}`
      : `/rankings/${country}/${type}`;

  try {
    const data = await fetchBrawlApi<RankingsResponse>(path, 120_000);
    return NextResponse.json({ ...data, type, country });
  } catch (error) {
    console.error("Failed to fetch rankings:", error);
    const status = error instanceof UpstreamApiError ? error.status : 502;
    return NextResponse.json({ error: "랭킹 정보를 불러오지 못했습니다." }, { status });
  }
}
