import { NextResponse } from "next/server";
import { getAuthenticatedAccount } from "../../../../server/account";
import { hasUsageAdminAccess, readUsageHours, readUsageLifetime, summarizeLifetime, summarizeUsage, summarizeEngagement } from "../../../../server/usageAnalytics";
import { readRecentSearchTags, readSearchCountries7Days } from "../../../../server/searchTagAnalytics";
import { readApiPerformanceHours } from "../../../../server/apiPerformance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
  try {
    const account = await getAuthenticatedAccount(request);
    if (!(await hasUsageAdminAccess(account.userId))) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
    }
    const [rows, lifetimeRows, recentSearchTags, searchCountries7Days, apiPerformance24h, apiPerformance7d] = await Promise.all([
      readUsageHours(), readUsageLifetime(), readRecentSearchTags(), readSearchCountries7Days(),
      readApiPerformanceHours(24), readApiPerformanceHours(168),
    ]);
    return NextResponse.json({
      ...summarizeUsage(rows),
      ...summarizeLifetime(lifetimeRows),
      engagement: summarizeEngagement(rows, lifetimeRows),
      recentSearchTags,
      searchCountries7Days,
      apiPerformance24h,
      apiPerformance7d,
    }, { headers });
  } catch {
    // Do not disclose whether a specific user exists or is allowlisted.
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
  }
}
