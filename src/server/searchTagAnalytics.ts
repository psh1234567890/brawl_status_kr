import "server-only";

import { db } from "../db";
import { isUsageOptedOut } from "./usageAnalytics";
import { isValidPlayerTag, normalizePlayerTag } from "../utils/playerTag";

// A bounded aggregate row per hour and public player tag. Do not add IPs,
// authenticated account IDs, cookies, or per-request rows to this table.
export async function recordSearchTag(tag: string, request?: Request): Promise<void> {
  if (process.env.VERCEL_ENV !== "production" ||
      (request && isUsageOptedOut(request)) ||
      !isValidPlayerTag(tag)) return;

  try {
    await db.$client.query(
      `INSERT INTO analytics_private.search_tag_hourly
        (hour_bucket, player_tag, search_count, last_searched_at)
       VALUES (date_trunc('hour', now()), $1, 1, now())
       ON CONFLICT (hour_bucket, player_tag) DO UPDATE SET
         search_count = analytics_private.search_tag_hourly.search_count + 1,
         last_searched_at = GREATEST(
           analytics_private.search_tag_hourly.last_searched_at, EXCLUDED.last_searched_at
         )`,
      [normalizePlayerTag(tag)],
    );
  } catch {
    // This optional statistic must never break player searches or log tags.
    console.warn(JSON.stringify({ event: "search_tag_analytics_unavailable" }));
  }
}

export type SearchTagSummary = {
  playerTag: string;
  searchCount: string;
  lastSearchedAt: string;
};

export async function readRecentSearchTags(): Promise<SearchTagSummary[]> {
  const result = await db.$client.query<SearchTagSummary>(
    `SELECT player_tag AS "playerTag",
            SUM(search_count)::text AS "searchCount",
            MAX(last_searched_at)::text AS "lastSearchedAt"
     FROM analytics_private.search_tag_hourly
     WHERE hour_bucket >= date_trunc('hour', now() - interval '7 days')
     GROUP BY player_tag
     ORDER BY MAX(last_searched_at) DESC, player_tag ASC
     LIMIT 200`,
  );
  return result.rows;
}
