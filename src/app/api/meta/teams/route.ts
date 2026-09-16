import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { queryTeamCompStats, queryTeamMaps } from "../../../../server/metaStats";
import { rejectRateLimitedRequest } from "../../../../server/rateLimit";

const getCachedTeamItems = unstable_cache(
  async (mapName: string) => (await queryTeamCompStats(mapName)).rows,
  ["team-meta-v2"],
  { revalidate: 60 },
);

const getCachedTeamMaps = unstable_cache(
  async () => (await queryTeamMaps()).rows.map((row) => row.map),
  ["team-map-list-v1"],
  { revalidate: 300 },
);

export async function GET(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "meta-teams", {
    limit: 60,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  const { searchParams } = new URL(request.url);
  const mapName = (searchParams.get("map") ?? "").trim();
  if (mapName.length > 120) {
    return NextResponse.json({ error: "맵 이름이 너무 깁니다." }, { status: 400 });
  }

  try {
    const maps = await getCachedTeamMaps();
    if (mapName && !maps.includes(mapName)) {
      return NextResponse.json({ error: "알 수 없는 맵입니다." }, { status: 400 });
    }
    const items = await getCachedTeamItems(mapName);
    return NextResponse.json({ items, maps });
  } catch (error) {
    console.error("Failed to calculate team comps:", error);
    return NextResponse.json({ error: "팀 조합 통계를 계산하지 못했습니다." }, { status: 500 });
  }
}
