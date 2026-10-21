import "server-only";

import { db } from "../db";
import { fetchBrawlApiSnapshot } from "./upstream";
import type { PlayerData } from "../types/brawl";
import { isValidPlayerTag, normalizePlayerTag } from "../utils/playerTag";

export type DashboardPlayer = {
  tag: string;
  name: string;
  trophies: number;
  highestTrophies: number;
  victories3v3: number;
  brawlerCount: number;
  iconId: number | null;
  currentRankedRankName?: string | null;
  currentRankedElo?: number | null;
  highestRankedRankName?: string | null;
  highestRankedElo?: number | null;
};
export type MyRank = {
  gameId: "higher-lower" | "release-order";
  period: "today" | "week" | "all";
  rank: number | null;
  score: number | null;
};

/** Private profile snapshot: deliberately skips the public search analytics. */
export async function readDashboardPlayer(defaultTag: string | null): Promise<DashboardPlayer | null> {
  const tag = normalizePlayerTag(defaultTag ?? "");
  if (!isValidPlayerTag(tag)) return null;
  const { data } = await fetchBrawlApiSnapshot<PlayerData>(
    `/players/%23${tag}`, 30_000, 5 * 60_000,
  );
  return {
    tag,
    name: data.name,
    trophies: data.trophies,
    highestTrophies: data.highestTrophies,
    victories3v3: data["3vs3Victories"],
    brawlerCount: Array.isArray(data.brawlers) ? data.brawlers.length : 0,
    iconId: data.icon?.id ?? null,
    currentRankedRankName: data.rankedRankName ?? null,
    currentRankedElo: data.rankedElo ?? null,
    highestRankedRankName: data.highestAllTimeRankedRankName ?? null,
    highestRankedElo: data.highestAllTimeRankedElo ?? null,
  };
}

const bounds = {
  today: "AND r.completed_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'",
  week: "AND r.completed_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') - interval '6 days') AT TIME ZONE 'Asia/Seoul'",
  all: "",
} as const;

/** Authenticated self-only query. No identity or private alias leaks into the public leaderboard. */
export async function readMyRankings(userId: string): Promise<MyRank[]> {
  const games = ["higher-lower", "release-order"] as const;
  const periods = ["today", "week", "all"] as const;
  return Promise.all(games.flatMap(gameId => periods.map(async period => {
    const result = await db.$client.query<{ rank: string; score: number }>(
      `WITH best AS (
         SELECT DISTINCT ON (r.user_id) r.user_id, r.score, r.completed_at
         FROM public.competitive_results r
         WHERE r.game_id = $1 AND r.ruleset_version = 1 ${bounds[period]}
         ORDER BY r.user_id, r.score DESC, r.completed_at ASC
       ),
       ranked AS (
         SELECT b.user_id, b.score,
                ROW_NUMBER() OVER (ORDER BY b.score DESC, b.completed_at ASC, a.public_alias ASC)::text AS rank
         FROM best b
         JOIN public.competitive_aliases a ON a.user_id = b.user_id
       )
       SELECT rank, score FROM ranked WHERE user_id = $2`,
      [gameId, userId],
    );
    return {
      gameId, period,
      rank: result.rows[0] ? Number(result.rows[0].rank) : null,
      score: result.rows[0] ? Number(result.rows[0].score) : null,
    };
  })));
}
