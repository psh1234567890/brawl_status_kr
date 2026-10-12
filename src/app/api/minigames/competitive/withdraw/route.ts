import { rejectCrossSiteMutation } from "../../../../../server/requestGuard";
import { AccountError, assertAllowedKeys, getAuthenticatedAccount, readBoundedJson, requireExpectedUser } from "../../../../../server/account";
import { accountErrorResponse, accountJson, enforceAccountRateLimit } from "../../../../../server/accountHttp";
import { areAccountsEnabled } from "../../../../../server/auth";
import { withdrawCompetitiveResults } from "../../../../../server/competitiveComparison";

export const runtime = "nodejs";
export async function POST(request: Request) {
  // Opt-out must remain available even if personal-best synchronization is paused.
  if (!areAccountsEnabled()) return accountJson({ error: "ACCOUNTS_DISABLED" }, 404);
  if (rejectCrossSiteMutation(request)) return accountJson({ error: "CROSS_SITE_REQUEST" }, 403);
  try {
    const account = await getAuthenticatedAccount(request);
    const body = await readBoundedJson(request, 1024);
    assertAllowedKeys(body, ["expectedUserId", "confirmWithdraw"]);
    requireExpectedUser(body, account.userId);
    if (body.confirmWithdraw !== true) throw new AccountError(400, "CONFIRM_REQUIRED");
    const limited = await enforceAccountRateLimit([
      { scope: "competitive-withdraw-user-hour", subject: account.userId, windowSeconds: 3600, maxRequests: 10 },
    ]);
    if (limited) return limited;
    await withdrawCompetitiveResults(account.userId);
    return accountJson({ withdrawn: true });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
