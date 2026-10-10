import { NextResponse } from "next/server";
import { getAuthenticatedAccount } from "../../../../server/account";
import { isUsageAdminUser, readUsageHours, summarizeUsage } from "../../../../server/usageAnalytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
  // Fail closed, even for authenticated users, until an explicit ID allowlist is set.
  if (!process.env.USAGE_ADMIN_USER_IDS?.trim()) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
  }
  try {
    const account = await getAuthenticatedAccount(request);
    if (!isUsageAdminUser(account.userId)) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
    }
    const rows = await readUsageHours();
    return NextResponse.json(summarizeUsage(rows), { headers });
  } catch {
    // Do not disclose whether a specific user exists or is allowlisted.
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
  }
}
