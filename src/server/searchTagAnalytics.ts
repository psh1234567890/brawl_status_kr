import "server-only";

import { db } from "../db";
import { isUsageOptedOut } from "./usageAnalytics";
import { isValidPlayerTag, normalizePlayerTag } from "../utils/playerTag";

// A bounded aggregate row per hour and public player tag. Do not add IPs,
// authenticated account IDs, cookies, or per-request rows to this table.
export function searchVisitorCountry(request?: Request): string {
  // The header is provided by Vercel for requests entering its edge. Never
  // attempt to geolocate or store the raw request IP in this feature.
  // Non-Vercel requests and missing/malformed country values remain unknown.
  if (process.env.VERCEL !== "1" || !request) return "ZZ";
  const country = request.headers.get("x-vercel-ip-country")?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(country) && country !== "ZZ" ? country : "ZZ";
}

export async function recordSearchTag(tag: string, request?: Request): Promise<void> {
  if (process.env.VERCEL_ENV !== "production" ||
      (request && isUsageOptedOut(request)) ||
      !isValidPlayerTag(tag)) return;

  try {
    const countryCode = searchVisitorCountry(request);
    await db.$client.query(
      `WITH counted AS (
        INSERT INTO analytics_private.search_tag_hourly
        (hour_bucket, player_tag, search_count, last_searched_at)
       VALUES (date_trunc('hour', now()), $1, 1, now())
       ON CONFLICT (hour_bucket, player_tag) DO UPDATE SET
         search_count = analytics_private.search_tag_hourly.search_count + 1,
         last_searched_at = GREATEST(
           analytics_private.search_tag_hourly.last_searched_at, EXCLUDED.last_searched_at
         )
         RETURNING hour_bucket, player_tag
       )
       INSERT INTO analytics_private.search_tag_country_hourly
         (hour_bucket, player_tag, country_code, search_count)
       SELECT hour_bucket, player_tag, $2, 1 FROM counted
       ON CONFLICT (hour_bucket, player_tag, country_code) DO UPDATE SET
         search_count = analytics_private.search_tag_country_hourly.search_count + 1`,
      [normalizePlayerTag(tag), countryCode],
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
  countries: Array<{ countryCode: string; searchCount: string }>;
};

export async function readRecentSearchTags(): Promise<SearchTagSummary[]> {
  const result = await db.$client.query<SearchTagSummary>(
    `WITH recent AS (
      SELECT player_tag AS "playerTag",
             SUM(search_count)::text AS "searchCount",
             MAX(last_searched_at)::text AS "lastSearchedAt"
      FROM analytics_private.search_tag_hourly
      WHERE hour_bucket >= date_trunc('hour', now() - interval '7 days')
      GROUP BY player_tag
      ORDER BY MAX(last_searched_at) DESC, player_tag ASC
      LIMIT 200
    ),
    country_totals AS (
      SELECT c.player_tag, c.country_code, SUM(c.search_count) AS total
      FROM analytics_private.search_tag_country_hourly c
      JOIN recent r ON r."playerTag" = c.player_tag
      WHERE c.hour_bucket >= date_trunc('hour', now() - interval '7 days')
      GROUP BY c.player_tag, c.country_code
    ),
    breakdown AS (
      SELECT player_tag,
             jsonb_agg(jsonb_build_object('countryCode', country_code,
                                         'searchCount', total::text)
                       ORDER BY total DESC, country_code ASC) AS countries
      FROM country_totals
      GROUP BY player_tag
    )
    SELECT r."playerTag", r."searchCount", r."lastSearchedAt",
           COALESCE(b.countries, '[]'::jsonb) AS countries
    FROM recent r
    LEFT JOIN breakdown b ON b.player_tag = r."playerTag"
    ORDER BY r."lastSearchedAt" DESC, r."playerTag" ASC`,
  );
  return result.rows;
}
