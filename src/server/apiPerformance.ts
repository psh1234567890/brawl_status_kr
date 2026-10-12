import { after } from "next/server";
import { db } from "../db";
import { isUsageOptedOut } from "../utils/analyticsOptOut";

const routeKeys = [
  "api.player",
  "api.player.matches.read",
  "api.player.matches.save",
  "api.player.skins",
  "api.meta",
  "api.meta.counters",
  "api.meta.teams",
] as const;

type RouteKey = (typeof routeKeys)[number];
type LatencyBucket = "le_250ms" | "le_500ms" | "le_1000ms" | "le_2000ms" |
  "le_5000ms" | "le_10000ms" | "over_10000ms";
type StatusBucket = "ok_count" | "not_found_count" | "rate_limited_count" |
  "other_4xx_count" | "server_error_count";

export function isMeasuredRoute(route: string): route is RouteKey {
  return (routeKeys as readonly string[]).includes(route);
}

export function latencyBucket(durationMs: number): LatencyBucket {
  if (durationMs <= 250) return "le_250ms";
  if (durationMs <= 500) return "le_500ms";
  if (durationMs <= 1_000) return "le_1000ms";
  if (durationMs <= 2_000) return "le_2000ms";
  if (durationMs <= 5_000) return "le_5000ms";
  if (durationMs <= 10_000) return "le_10000ms";
  return "over_10000ms";
}

export function statusBucket(status: number): StatusBucket {
  if (status >= 500) return "server_error_count";
  if (status === 429) return "rate_limited_count";
  if (status === 404) return "not_found_count";
  if (status >= 400) return "other_4xx_count";
  return "ok_count";
}

/** Only the fixed route name, status class and latency bucket reach SQL. */
export async function recordApiPerformance(route: RouteKey, status: number, durationMs: number): Promise<void> {
  const latency = latencyBucket(durationMs);
  const statusClass = statusBucket(status);
  const cappedDuration = Math.min(120_000, Math.max(0, durationMs));
  try {
    // Column identifiers are chosen exclusively from the static unions above.
    await db.$client.query(
      `INSERT INTO analytics_private.api_performance_hourly
       (hour_bucket, route_key, request_count, total_duration_ms, ${statusClass}, ${latency})
       VALUES (date_trunc('hour', now()), $1, 1, $2, 1, 1)
       ON CONFLICT (hour_bucket, route_key)
       DO UPDATE SET request_count = analytics_private.api_performance_hourly.request_count + 1,
                     total_duration_ms = analytics_private.api_performance_hourly.total_duration_ms + EXCLUDED.total_duration_ms,
                     ${statusClass} = analytics_private.api_performance_hourly.${statusClass} + 1,
                     ${latency} = analytics_private.api_performance_hourly.${latency} + 1`,
      [route, cappedDuration],
    );
  } catch {
    // Missing table, database outage or a timed-out write must not fail a public API.
    console.warn(JSON.stringify({ event: "api_performance_counter_unavailable", route }));
  }
}

export function scheduleApiPerformance(request: Request, route: string, status: number, durationMs: number) {
  if (process.env.VERCEL_ENV !== "production" || !isMeasuredRoute(route)) return;
  if (isUsageOptedOut(request) || !Number.isFinite(durationMs) || durationMs < 0) return;
  // Next.js guarantees after callbacks finish after the response is sent.
  // Do not expose database latency to player search.
  after(async () => { await recordApiPerformance(route, status, durationMs); });
}

export type ApiPerformanceRow = {
  route: string;
  requests: string;
  totalDuration: string;
  ok: string;
  notFound: string;
  rateLimited: string;
  other4xx: string;
  serverErrors: string;
  le250: string;
  le500: string;
  le1000: string;
  le2000: string;
  le5000: string;
  le10000: string;
  over10000: string;
};

export async function readApiPerformanceHours(hours = 168): Promise<ApiPerformanceRow[]> {
  const safeHours = hours === 24 ? 24 : 168;
  const result = await db.$client.query<ApiPerformanceRow>(
    `SELECT route_key AS route, SUM(request_count)::text AS requests,
            SUM(total_duration_ms)::text AS "totalDuration",
            SUM(ok_count)::text AS ok, SUM(not_found_count)::text AS "notFound",
            SUM(rate_limited_count)::text AS "rateLimited",
            SUM(other_4xx_count)::text AS "other4xx",
            SUM(server_error_count)::text AS "serverErrors",
            SUM(le_250ms)::text AS "le250", SUM(le_500ms)::text AS "le500",
            SUM(le_1000ms)::text AS "le1000", SUM(le_2000ms)::text AS "le2000",
            SUM(le_5000ms)::text AS "le5000", SUM(le_10000ms)::text AS "le10000",
            SUM(over_10000ms)::text AS "over10000"
       FROM analytics_private.api_performance_hourly
       WHERE hour_bucket >= date_trunc('hour', now() - ($1::integer * interval '1 hour'))
       GROUP BY route_key ORDER BY SUM(request_count) DESC, route_key`,
    [safeHours],
  );
  return result.rows;
}
