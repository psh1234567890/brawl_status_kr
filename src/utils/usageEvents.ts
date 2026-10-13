// Fixed event names only. Never send paths, tags, account IDs or referrers.
export const clientUsageKinds = [
  "visit_session", "page_view", "browser_session", "browser_return_7d",
  "profile_save", "profile_unsave", "profile_compare", "comparison_run",
  "profile_share", "profile_reopen",
  "minigame_brawler_quiz", "minigame_silhouette_quiz",
  "minigame_map_quiz", "minigame_ability_quiz",
] as const;
export type ClientUsageKind = (typeof clientUsageKinds)[number];
export function isClientUsageKind(value: unknown): value is ClientUsageKind {
  return typeof value === "string" && (clientUsageKinds as readonly string[]).includes(value);
}

export const engagementFields = {
  page_view: "pageViews", browser_session: "browserSessions",
  browser_return_7d: "returningBrowserSessions", profile_save: "saves",
  profile_unsave: "unsaves", profile_compare: "compareOpens",
  comparison_run: "comparisonRuns", profile_share: "shares", profile_reopen: "reopens",
} as const;
export type EngagementCounts = Record<(typeof engagementFields)[keyof typeof engagementFields], number>;
export function emptyEngagement(): EngagementCounts {
  return { pageViews: 0, browserSessions: 0, returningBrowserSessions: 0,
    saves: 0, unsaves: 0, compareOpens: 0, comparisonRuns: 0, shares: 0, reopens: 0 };
}

export const BROWSER_ACTIVITY_KEY = "brawl_usage_last_activity_v1";
const SESSION_GAP_MS = 30 * 60_000;
const RETURN_WINDOW_MS = 7 * 86_400_000;
/** Local timestamps only: approximate sessions, never a unique-person/cohort metric. */
export function browserSessionEvents(previous: string | null, now: number): ClientUsageKind[] {
  const last = previous === null ? NaN : Number(previous);
  if (Number.isFinite(last) && last > 0 && now >= last && now - last < SESSION_GAP_MS) return [];
  const returned = Number.isFinite(last) && last > 0 && now >= last && now - last <= RETURN_WINDOW_MS;
  return returned ? ["browser_session", "browser_return_7d"] : ["browser_session"];
}
