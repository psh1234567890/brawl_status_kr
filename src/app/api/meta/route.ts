import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { queryMapMetaStats } from "../../../server/metaStats";
import { observeServerOperation, withApiMonitoring } from "../../../server/observability";
import { rejectRateLimitedRequest } from "../../../server/rateLimit";

const MINIMUM_PLAYS = 5;
const MEDIUM_CONFIDENCE_PLAYS = 20;
const HIGH_CONFIDENCE_PLAYS = 50;

type SampleConfidence = "LOW" | "MEDIUM" | "HIGH";

type BrawlerMapStat = {
  id?: number;
  name: string;
  plays: number;
  wins: number;
  draws: number;
  winRate: number;
  score: number;
  confidence: SampleConfidence;
  confidenceScore: number;
};

type MapStatsResponse = Record<string, BrawlerMapStat[]>;

const getCachedMetaStats = unstable_cache(
  async () => {
    const queryResult = await observeServerOperation(
      "db.meta.stats",
      () => queryMapMetaStats(MINIMUM_PLAYS),
      { slowMs: 5_000 },
    );

    const result: MapStatsResponse = {};
    for (const row of queryResult.rows) {
      if (row.brawlerName === "Unknown") continue;

      const plays = Number(row.plays);
      const wins = Number(row.wins);
      const draws = Number(row.draws);
      const winRate = plays > 0 ? Math.floor((wins / plays) * 100) : 0;
      const score = Math.floor((winRate * plays) / (plays + MINIMUM_PLAYS));

      result[row.map] ??= [];
      result[row.map].push({
        id: row.brawlerId ?? undefined,
        name: row.brawlerName,
        plays,
        wins,
        draws,
        winRate,
        score,
        confidence: getSampleConfidence(plays),
        confidenceScore: getConfidenceScore(plays),
      });
    }

    for (const mapName of Object.keys(result)) {
      result[mapName].sort((left, right) => right.score - left.score);
    }
    return result;
  },
  ["meta-stats-v8-perspective-flag"],
  { revalidate: 300, tags: ["meta-stats"] },
);

function getSampleConfidence(plays: number): SampleConfidence {
  if (plays >= HIGH_CONFIDENCE_PLAYS) return "HIGH";
  if (plays >= MEDIUM_CONFIDENCE_PLAYS) return "MEDIUM";
  return "LOW";
}

function getConfidenceScore(plays: number) {
  return Math.min(100, Math.round((plays / HIGH_CONFIDENCE_PLAYS) * 100));
}

async function getMeta(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "meta", {
    limit: 90,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  try {
    return NextResponse.json(await getCachedMetaStats());
  } catch (error) {
    console.error("Failed to calculate meta stats:", error);
    return NextResponse.json(
      { error: "메타 통계를 계산하지 못했습니다." },
      { status: 500 },
    );
  }
}

export const GET = withApiMonitoring("api.meta", getMeta, { slowMs: 1_500 });
