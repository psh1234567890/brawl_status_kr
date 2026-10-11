import { NextResponse } from "next/server";
import { getAuthenticatedAccount } from "../../../../server/account";
import { hasUsageAdminAccess, readUsageHours, summarizeUsage } from "../../../../server/usageAnalytics";
import { readRecentConsentedSearches } from "../../../../server/usageSearchDetails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
  try {
    const account = await getAuthenticatedAccount(request);
    if (!(await hasUsageAdminAccess(account.userId))) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
    }
    const rows = await readUsageHours();
    const recentSearches = await readRecentConsentedSearches();
    return NextResponse.json({ ...summarizeUsage(rows), recentSearches }, { headers });
  } catch {
    // Do not disclose whether a specific user exists or is allowlisted.
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
  }
}
