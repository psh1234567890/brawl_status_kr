import "server-only";
import { db } from "../db";
import { isUsageOptedOut } from "../utils/analyticsOptOut";
export { isUsageOptedOut } from "../utils/analyticsOptOut";

export const usageKinds = [
  "visit_session", "player_search_success", "player_search_error",
  "player_search_error_404", "player_search_error_429",
  "player_search_error_5xx", "player_search_error_other",
  "minigame_brawler_quiz", "minigame_silhouette_quiz",
  "minigame_map_quiz", "minigame_ability_quiz",
] as const;
export type UsageKind = (typeof usageKinds)[number];

export const searchFailureKinds = [
  "player_search_error_404", "player_search_error_429",
  "player_search_error_5xx", "player_search_error_other",
] as const;
export type SearchFailureKind = (typeof searchFailureKinds)[number];

export function classifyPlayerSearchFailure(status: number): SearchFailureKind {
  if (status === 404) return "player_search_error_404";
  if (status === 429) return "player_search_error_429";
  if (status >= 500) return "player_search_error_5xx";
  return "player_search_error_other";
}

function emptyFailureBreakdown(): Record<SearchFailureKind, number> {
  return Object.fromEntries(searchFailureKinds.map(kind => [kind, 0])) as Record<SearchFailureKind, number>;
}

export function isUsageKind(value: unknown): value is UsageKind {
  return typeof value === "string" && (usageKinds as readonly string[]).includes(value);
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
    // Retention is enforced daily by pg_cron, independently of site traffic.
    // Avoid an unnecessary DELETE statement on every anonymous event write.
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

export type UsageLifetimeRow = {
  kind: UsageKind;
  count: string;
  firstSeenAt: string;
};

export async function readUsageLifetime(): Promise<UsageLifetimeRow[]> {
  const result = await db.$client.query<UsageLifetimeRow>(
    `SELECT event_kind AS kind, event_count::text AS count,
            first_seen_at::text AS "firstSeenAt"
       FROM analytics_private.usage_lifetime
       ORDER BY event_kind`,
  );
  return result.rows;
}

function emptyCounts() {
  return { visits: 0, searches: 0, successfulSearches: 0, gameEnds: 0 };
}

export function summarizeLifetime(rows: UsageLifetimeRow[]) {
  const allTime = emptyCounts();
  const failureReasonsAllTime = emptyFailureBreakdown();
  const byGameAllTime: Record<string, number> = {};
  let trackingStartedAt: string | null = null;
  for (const row of rows) {
    if (!isUsageKind(row.kind)) continue;
    const count = Number(row.count);
    if (!Number.isSafeInteger(count) || count < 0) continue;
    if (!trackingStartedAt || new Date(row.firstSeenAt).getTime() < new Date(trackingStartedAt).getTime()) {
      trackingStartedAt = row.firstSeenAt;
    }
    if (row.kind === "visit_session") allTime.visits += count;
    else if (row.kind === "player_search_success") {
      allTime.searches += count;
      allTime.successfulSearches += count;
    } else if (row.kind === "player_search_error") allTime.searches += count;
    else if ((searchFailureKinds as readonly string[]).includes(row.kind)) {
      failureReasonsAllTime[row.kind as SearchFailureKind] += count;
    }
    else if (row.kind.startsWith("minigame_")) {
      allTime.gameEnds += count;
      const game = row.kind.slice("minigame_".length);
      byGameAllTime[game] = (byGameAllTime[game] ?? 0) + count;
    }
  }
  return { allTime, byGameAllTime, failureReasonsAllTime, trackingStartedAt };
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
  const byGameToday: Record<string, number> = {};
  const failureReasonsToday = emptyFailureBreakdown();
  const failureReasonsLast7Days = emptyFailureBreakdown();
  const cutoff = days[0];
  for (const row of rows) {
    const count = Number(row.count);
    if (!Number.isSafeInteger(count) || count < 0) continue;
    const day = row.hour.slice(0, 10);
    if ((searchFailureKinds as readonly string[]).includes(row.kind)) {
      const kind = row.kind as SearchFailureKind;
      if (day === todayKst) failureReasonsToday[kind] += count;
      if (day >= cutoff && day <= todayKst) failureReasonsLast7Days[kind] += count;
      continue;
    }
    const key = row.kind === "visit_session" ? "visits"
      : row.kind === "player_search_success" || row.kind === "player_search_error" ? "searches" : "gameEnds";
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
      if (day === todayKst) {
        byGameToday[row.kind.slice(9)] = (byGameToday[row.kind.slice(9)] ?? 0) + count;
      }
    }
  }
  return {
    today, last7Days, daily, byGame, byGameToday, failureReasonsToday, failureReasonsLast7Days,
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
