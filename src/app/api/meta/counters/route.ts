import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { queryCounterStats } from "../../../../server/metaStats";
import { observeServerOperation, withApiMonitoring } from "../../../../server/observability";
import { rejectRateLimitedRequest } from "../../../../server/rateLimit";

const getCachedCounterStats = unstable_cache(
  async (brawler: string) =>
    (
      await observeServerOperation("db.meta.counters", () => queryCounterStats(brawler), {
        slowMs: 5_000,
      })
    ).rows,
  ["counter-meta-v4-normalized"],
  { revalidate: 60 },
);

async function getCounters(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "meta-counters", {
    limit: 60,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  const { searchParams } = new URL(request.url);
  const brawler = (searchParams.get("brawler") ?? "").trim().toUpperCase();
  if (!brawler) {
    return NextResponse.json({ error: "브롤러 이름이 필요합니다." }, { status: 400 });
  }
  if (brawler.length > 40) {
    return NextResponse.json({ error: "브롤러 이름이 너무 깁니다." }, { status: 400 });
  }
  try {
    return NextResponse.json({ items: await getCachedCounterStats(brawler) });
  } catch (error) {
    console.error("Failed to calculate counters:", error);
    return NextResponse.json({ error: "카운터 통계를 계산하지 못했습니다." }, { status: 500 });
  }
}

export const GET = withApiMonitoring("api.meta.counters", getCounters, { slowMs: 1_500 });
