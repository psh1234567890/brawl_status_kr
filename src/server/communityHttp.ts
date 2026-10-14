import "server-only";
import { AccountError, assertAllowedKeys, getAuthenticatedAccount, readBoundedJson, requireExpectedUser, requireOnboardedAccount } from "./account";
import { accountJson, enforceAccountRateLimit } from "./accountHttp";
import { rejectCrossSiteMutation } from "./requestGuard";
import { hasUsageAdminAccess } from "./usageAnalytics";
import { CommunityError } from "../utils/community";

export function communityJson(body: unknown, status = 200) {
  return accountJson(body, status, { "X-Robots-Tag": "noindex, nofollow" });
}
export function communityError(error: unknown) {
  if (error instanceof CommunityError || error instanceof AccountError) return communityJson({ error: error.code }, error.status);
  return communityJson({ error: "COMMUNITY_UNAVAILABLE" }, 503);
}
export async function optionalCommunityUser(request: Request) {
  try { return (await getAuthenticatedAccount(request)).userId; } catch { return undefined; }
}
export async function requireCommunityAdmin(request: Request) {
  try {
    const account = await getAuthenticatedAccount(request);
    if (await hasUsageAdminAccess(account.userId)) return account.userId;
  } catch { /* Hide administrator identity and allowlist failures. */ }
  throw new CommunityError(404, "NOT_FOUND");
}
export async function communityMutation(request: Request, options: {
  keys: string[]; action: "post" | "comment" | "withdraw" | "moderate";
}, handler: (userId: string, body: Record<string, unknown>) => Promise<unknown>) {
  if (rejectCrossSiteMutation(request)) return communityJson({ error: "CROSS_SITE_REQUEST" }, 403);
  try {
    const userId = options.action === "moderate" ? await requireCommunityAdmin(request) : (await getAuthenticatedAccount(request)).userId;
    const body = await readBoundedJson(request, 24 * 1024);
    assertAllowedKeys(body, ["expectedUserId", ...options.keys]);
    requireExpectedUser(body, userId);
    if (options.action === "post" || options.action === "comment") await requireOnboardedAccount(userId);
    const rule = {
      post: { scope: "community-post-user-day", windowSeconds: 86400, maxRequests: 3 },
      comment: { scope: "community-comment-user-hour", windowSeconds: 3600, maxRequests: 20 },
      withdraw: { scope: "community-withdraw-user-hour", windowSeconds: 3600, maxRequests: 30 },
      moderate: { scope: "community-moderate-user-hour", windowSeconds: 3600, maxRequests: 120 },
    }[options.action];
    const limited = await enforceAccountRateLimit([{ ...rule, subject: userId }]);
    if (limited) return limited;
    return communityJson(await handler(userId, body), options.action === "post" || options.action === "comment" ? 201 : 200);
  } catch (error) { return communityError(error); }
}
