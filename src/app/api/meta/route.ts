import { revalidateTag, unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { assertMetaSnapshotFresh, MetaSnapshotUnavailableError, queryMapMetaStats } from "../../../server/metaStats";
import { observeServerOperation, withApiMonitoring } from "../../../server/observability";
import { rejectRateLimitedRequest } from "../../../server/rateLimit";
import { rejectSharedPublicRateLimit } from "../../../server/sharedPublicRateLimit";

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
  recentPlays?: number;
  lastBattleAt?: string;
};

type MapStatsResponse = { mode: string; map: string; brawlers: BrawlerMapStat[] }[];

const getCachedMetaStats = unstable_cache(
  async () => {
    const queryResult = await observeServerOperation(
      "db.meta.stats",
      () => queryMapMetaStats(MINIMUM_PLAYS),
      { slowMs: 5_000 },
    );

    const entries = new Map<string, MapStatsResponse[number]>();
    for (const row of queryResult.rows) {
      if (row.brawlerName === "Unknown") continue;

      const plays = Number(row.plays);
      const wins = Number(row.wins);
      const draws = Number(row.draws);
      const winRate = plays > 0 ? Math.floor((wins / plays) * 100) : 0;
      const score = Math.floor((winRate * plays) / (plays + MINIMUM_PLAYS));

      const key = JSON.stringify([row.mode, row.map]);
      if (!entries.has(key)) {
        entries.set(key, { mode: row.mode, map: row.map, brawlers: [] });
      }
      entries.get(key)!.brawlers.push({
        id: row.brawlerId ?? undefined,
        name: row.brawlerName,
        plays,
        wins,
        draws,
        winRate,
        score,
        confidence: getSampleConfidence(plays),
        confidenceScore: getConfidenceScore(plays),
        recentPlays: row.recentPlays == null ? undefined : Number(row.recentPlays),
        lastBattleAt: row.lastBattleAt ? new Date(row.lastBattleAt).toISOString() : undefined,
      });
    }

    const result = [...entries.values()];
    for (const entry of result) {
      entry.brawlers.sort((left, right) => right.score - left.score);
    }
    return { maps: result, refreshedAt: queryResult.rows[0]?.refreshedAt ?? null };
  },
  ["meta-stats-v13-observed-recency"],
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
  const sharedLimited = await rejectSharedPublicRateLimit(request, "public-meta", 90);
  if (sharedLimited) return sharedLimited;

  try {
    let snapshot = await getCachedMetaStats();
    // Revalidation can retain a previously successful cache after DB errors.
    // Enforce the age limit on cache hits as well as newly queried snapshots.
    if (snapshot.refreshedAt !== null) {
      try {
        assertMetaSnapshotFresh(snapshot.refreshedAt);
      } catch (error) {
        if (!(error instanceof MetaSnapshotUnavailableError)) throw error;
        // Next's stale-while-revalidate cache can outlive a quiet period even
        // while pg_cron keeps the DB snapshot fresh. Block for one fresh read
        // before reporting an outage; never serve statistics past the age limit.
        revalidateTag("meta-stats", { expire: 0 });
        snapshot = await getCachedMetaStats();
        if (snapshot.refreshedAt !== null) assertMetaSnapshotFresh(snapshot.refreshedAt);
      }
    }
    return NextResponse.json(snapshot.maps, {
      headers: {
        "X-Meta-Scoring-Version": "legacy-v1",
        ...(snapshot.refreshedAt ? { "X-Meta-Refreshed-At": new Date(snapshot.refreshedAt).toISOString() } : {}),
      },
    });
  } catch (error) {
    if (error instanceof MetaSnapshotUnavailableError) {
      console.warn(JSON.stringify({ event: "meta_snapshot_unavailable" }));
      return NextResponse.json(
        { error: "메타 통계 갱신이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.", code: "META_SNAPSHOT_UNAVAILABLE" },
        { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } },
      );
    }
    console.error("Failed to calculate meta stats:", error);
    return NextResponse.json(
      { error: "메타 통계를 계산하지 못했습니다." },
      { status: 500 },
    );
  }
}

export const GET = withApiMonitoring("api.meta", getMeta, { slowMs: 1_500 });
