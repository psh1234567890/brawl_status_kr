import "server-only";

import { isIP } from "node:net";
import { db } from "../db";
import { getAuthenticatedAccount } from "./account";
import { getClientAddress } from "./rateLimit";
import { isUsageOptedOut } from "./usageAnalytics";
import { isValidPlayerTag, normalizePlayerTag } from "../utils/playerTag";

const CONSENT_COOKIE = "brawl_search_detail_consent";
const RETENTION_DAYS = 7;

export function hasSearchDetailConsent(request: Request): boolean {
  const match = (request.headers.get("cookie") ?? "").match(/(?:^|;\\s*)brawl_search_detail_consent=([^;]+)/);
  return match?.[1] === "1" && !isUsageOptedOut(request);
}

// Deliberately discard most of the IP. This is a network *range*, not a
// visitor identifier, and should never be used to claim two people are the same.
export function maskIpRange(address: string): string | null {
  const type = isIP(address);
  if (type === 4) {
    const parts = address.split(".");
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.x.x` : null;
  }
  if (type === 6) {
    // Keep only the first one or two printed network groups. Never expose raw
    // IPv6 values, IPv4-mapped tails, or any request forwarding headers.
    const groups = address.toLowerCase().split(":").filter(Boolean);
    return groups.length ? `${groups.slice(0, 2).join(":")}:…` : null;
  }
  return null;
}

export async function recordConsentedSearchDetail(request: Request, tag: string): Promise<void> {
  if (process.env.VERCEL_ENV !== "production" || !hasSearchDetailConsent(request) ||
      !isValidPlayerTag(tag)) return;

  const cleanTag = normalizePlayerTag(tag);
  const masked = maskIpRange(getClientAddress(request));
  let accountId: string | null = null;
  try {
    // Never accept identity from the request payload. Recheck the real session.
    accountId = (await getAuthenticatedAccount(request)).userId;
  } catch {
    // Guests still participate anonymously if they opted in.
  }
  try {
    await db.$client.query(
      `INSERT INTO analytics_private.consented_search_details
          (player_tag, masked_ip_range, authenticated_account_id)
       VALUES ($1, $2, $3)`,
      [cleanTag, masked, accountId],
    );
    await db.$client.query(
      `DELETE FROM analytics_private.consented_search_details
       WHERE searched_at < now() - interval '${RETENTION_DAYS} days'`,
    );
  } catch {
    // No user-identifying strings or errors in logs; analytics is optional.
    console.warn(JSON.stringify({ event: "consented_search_detail_unavailable" }));
  }
}

export type RecentConsentedSearch = {
  searchedAt: string;
  playerTag: string;
  maskedIpRange: string | null;
  accountNickname: string | null;
  accountIdShort: string | null;
};
export async function readRecentConsentedSearches(): Promise<RecentConsentedSearch[]> {
  const result = await db.$client.query<RecentConsentedSearch>(
    `SELECT d.searched_at::text AS "searchedAt",
        d.player_tag AS "playerTag",
        d.masked_ip_range AS "maskedIpRange",
        u.name AS "accountNickname",
        CASE WHEN u.id IS NOT NULL THEN left(u.id::text, 8) ELSE NULL END AS "accountIdShort"
     FROM analytics_private.consented_search_details AS d
     LEFT JOIN public.auth_users AS u ON u.id = d.authenticated_account_id
     WHERE d.searched_at >= now() - interval '${RETENTION_DAYS} days'
     ORDER BY d.searched_at DESC, d.id DESC
     LIMIT 40`,
  );
  return result.rows;
}
