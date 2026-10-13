export type SearchCounts = { searches: number; successfulSearches: number };

/** Null means no searches were made, never a misleading 0% success rate. */
export function searchSuccessRate(counts: SearchCounts): number | null {
  if (!Number.isFinite(counts.searches) || counts.searches <= 0) return null;
  if (!Number.isFinite(counts.successfulSearches)) return null;
  return Math.round((Math.max(0, counts.successfulSearches) / counts.searches) * 1000) / 10;
}

export function countryShare(count: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(count)) return 0;
  return Math.round((Math.max(0, count) / total) * 1000) / 10;
}

/** Returning sessions among locally measurable browser sessions, not cohort retention. */
export function browserReturnShare(returns: number, sessions: number): number | null {
  if (!Number.isSafeInteger(sessions) || sessions <= 0 || !Number.isSafeInteger(returns) || returns < 0 || returns > sessions) return null;
  return Math.round(returns / sessions * 1000) / 10;
}
