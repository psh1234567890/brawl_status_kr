export type ApiPerformanceCounts = {
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

/** These are disjoint buckets, so the P95 can only be localized to a range. */
const upperBounds = [
  ["le250", "≤250ms"], ["le500", "250~500ms"], ["le1000", "500ms~1초"],
  ["le2000", "1~2초"], ["le5000", "2~5초"], ["le10000", "5~10초"],
  ["over10000", "10초 초과"],
] as const;

export function summarizeApiPerformance(row: ApiPerformanceCounts) {
  const requests = Number(row.requests);
  const safeRequests = Number.isSafeInteger(requests) && requests > 0 ? requests : 0;
  const serverErrors = Number(row.serverErrors);
  const rateLimited = Number(row.rateLimited);
  const averageMs = safeRequests > 0 ? Number(row.totalDuration) / safeRequests : null;
  const serverErrorRate = safeRequests > 0 ? (serverErrors / safeRequests) * 100 : null;
  const limitRate = safeRequests > 0 ? (rateLimited / safeRequests) * 100 : null;
  let p95Band: string | null = null;
  if (safeRequests > 0) {
    let cumulative = 0;
    const threshold = Math.ceil(safeRequests * 0.95);
    for (const [bucket, label] of upperBounds) {
      cumulative += Number(row[bucket]);
      if (cumulative >= threshold) {
        p95Band = label;
        break;
      }
    }
  }
  return {
    requests: safeRequests,
    averageMs: averageMs !== null && Number.isFinite(averageMs) ? Math.round(averageMs) : null,
    serverErrors: Number.isFinite(serverErrors) ? serverErrors : 0,
    rateLimited: Number.isFinite(rateLimited) ? rateLimited : 0,
    serverErrorRate: serverErrorRate !== null && Number.isFinite(serverErrorRate) ? serverErrorRate : null,
    limitRate: limitRate !== null && Number.isFinite(limitRate) ? limitRate : null,
    p95Band,
  };
}
