import { NextResponse } from "next/server";
import { getAuthenticatedAccount } from "../../../../server/account";
import { hasUsageAdminAccess, readUsageHours, readUsageLifetime, summarizeLifetime, summarizeUsage } from "../../../../server/usageAnalytics";
import { readRecentSearchTags, readSearchCountries7Days } from "../../../../server/searchTagAnalytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
  try {
    const account = await getAuthenticatedAccount(request);
    if (!(await hasUsageAdminAccess(account.userId))) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
    }
    const [rows, lifetimeRows, recentSearchTags, searchCountries7Days] = await Promise.all([
      readUsageHours(), readUsageLifetime(), readRecentSearchTags(), readSearchCountries7Days(),
    ]);
    return NextResponse.json({
      ...summarizeUsage(rows),
      ...summarizeLifetime(lifetimeRows),
      recentSearchTags,
      searchCountries7Days,
    }, { headers });
  } catch {
    // Do not disclose whether a specific user exists or is allowlisted.
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
  }
}
