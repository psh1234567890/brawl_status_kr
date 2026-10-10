import "server-only";
import { db } from "../db";

export const usageKinds = [
  "visit_session", "player_search_success", "player_search_error",
  "minigame_brawler_quiz", "minigame_silhouette_quiz",
  "minigame_map_quiz", "minigame_ability_quiz",
] as const;
export type UsageKind = (typeof usageKinds)[number];

export function isUsageKind(value: unknown): value is UsageKind {
  return typeof value === "string" && (usageKinds as readonly string[]).includes(value);
}

export function isUsageOptedOut(request: Request): boolean {
  return /(?:^|;\s*)brawl_analytics_opt_out=1(?:;|$)/.test(request.headers.get("cookie") ?? "");
}

// The DB contains only counters; never pass tags, IPs, cookies, user IDs or
// arbitrary client strings to the INSERT. Analytics must not break game search.
export async function recordUsageEvent(kind: UsageKind, request?: Request): Promise<void> {
  // Preview deployments and browser E2E must not inflate production usage counts.
  if (process.env.VERCEL_ENV !== "production") return;
  if (request && isUsageOptedOut(request)) return;
  try {
    await db.$client.query(
      `INSERT INTO analytics_private.usage_hourly (hour_bucket, event_kind, event_count)
       VALUES (date_trunc('hour', now()), $1, 1)
       ON CONFLICT (hour_bucket, event_kind)
       DO UPDATE SET event_count = analytics_private.usage_hourly.event_count + 1`,
      [kind],
    );
    // Small indexed deletion, keeping only 90 days of anonymous counts.
    await db.$client.query(
      "DELETE FROM analytics_private.usage_hourly WHERE hour_bucket < date_trunc('hour', now()) - interval '90 days'",
    );
  } catch {
    console.warn(JSON.stringify({ event: "usage_counter_unavailable", kind }));
  }
}

export type UsageHourRow = {
  hour: string;
  kind: UsageKind;
  count: string;
};
export async function readUsageHours(): Promise<UsageHourRow[]> {
  const result = await db.$client.query<UsageHourRow>(
    `SELECT to_char(hour_bucket AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:00') AS hour,
       event_kind AS kind, event_count::text AS count
     FROM analytics_private.usage_hourly
     WHERE hour_bucket >= now() - interval '32 days'
     ORDER BY hour_bucket DESC, event_kind ASC`,
  );
  return result.rows;
}

export function summarizeUsage(
  rows: UsageHourRow[],
  now = new Date(),
) {
  const todayKst = new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
  const days = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.parse(todayKst + "T00:00:00Z") - (6 - i) * 86_400_000).toISOString().slice(0, 10)
  );
  const daily = days.map(day => ({ day, visits: 0, searches: 0, successfulSearches: 0, gameEnds: 0 }));
  const byDay = new Map(daily.map(item => [item.day, item]));
  const today = { visits: 0, searches: 0, successfulSearches: 0, gameEnds: 0 };
  const last7Days = { visits: 0, searches: 0, successfulSearches: 0, gameEnds: 0 };
  const byGame: Record<string, number> = {};
  const cutoff = days[0];
  for (const row of rows) {
    const count = Number(row.count);
    if (!Number.isSafeInteger(count) || count < 0) continue;
    const day = row.hour.slice(0, 10);
    const key = row.kind === "visit_session" ? "visits"
      : row.kind.startsWith("player_search") ? "searches" : "gameEnds";
    const apply = (target: typeof today) => {
      target[key] += count;
      if (row.kind === "player_search_success") target.successfulSearches += count;
    };
    if (day === todayKst) apply(today);
    if (day >= cutoff && day <= todayKst) {
      apply(last7Days);
      const entry = byDay.get(day);
      if (entry) apply(entry);
    }
    if (row.kind.startsWith("minigame_") && day >= cutoff && day <= todayKst) {
      byGame[row.kind.slice(9)] = (byGame[row.kind.slice(9)] ?? 0) + count;
    }
  }
  return {
    today, last7Days, daily, byGame,
    recentHours: rows.filter(row => row.hour >= new Date(now.getTime() + 9 * 3600_000 - 24 * 3600_000)
      .toISOString().slice(0, 13).replace("T", " ")).slice(0, 35),
    sampledAt: now.toISOString(),
  };
}

export function isUsageAdminUser(userId: string): boolean {
  const allowed = (process.env.USAGE_ADMIN_USER_IDS ?? "").split(",").map(x => x.trim()).filter(Boolean);
  return allowed.length > 0 && allowed.includes(userId);
}

/**
 * Authorize a previously authenticated account using a private, server-side
 * allowlist. This also supports the original optional environment allowlist.
 * Do not use a player tag, client-provided UUID or a query parameter here.
 */
export async function hasUsageAdminAccess(authenticatedUserId: string): Promise<boolean> {
  if (isUsageAdminUser(authenticatedUserId)) return true;
  // UUID comes from getAuthenticatedAccount, but validate again before casting.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authenticatedUserId)) {
    return false;
  }
  const result = await db.$client.query<{ allowed: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM analytics_private.usage_admin_allowlist WHERE user_id = $1::uuid) AS allowed",
    [authenticatedUserId],
  );
  return result.rows[0]?.allowed === true;
}
