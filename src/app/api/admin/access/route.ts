import { NextResponse } from "next/server";
import { getAuthenticatedAccount } from "../../../../server/account";
import { hasUsageAdminAccess } from "../../../../server/usageAnalytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A lightweight permission probe; the private report API still reauthorizes every request. */
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
  try {
    const { userId } = await getAuthenticatedAccount(request);
    if (await hasUsageAdminAccess(userId)) {
      return new Response(null, { status: 204, headers });
    }
  } catch {
    // Do not distinguish guests, unauthorized accounts and unavailable allowlists.
  }
  return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
}
