import "server-only";

// Operational circuit breaker; never prevents a signed-in participant from
// withdrawing existing public ranking entries.
export function isCompetitiveRankingEnabled() {
  return process.env.COMPETITIVE_RANKINGS_ENABLED !== "0";
}
