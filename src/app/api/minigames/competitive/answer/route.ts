import { rejectCrossSiteMutation } from "../../../../../server/requestGuard";
import { AccountError, assertAllowedKeys, getAuthenticatedAccount, isUUID, readBoundedJson, requireExpectedUser, requireOnboardedAccount } from "../../../../../server/account";
import { accountErrorResponse, accountJson, enforceAccountRateLimit } from "../../../../../server/accountHttp";
import { isAccountSyncEnabled } from "../../../../../server/auth";
import { submitCompetitiveAnswer } from "../../../../../server/competitiveComparison";
import { isCompetitiveRankingEnabled } from "../../../../../server/competitiveFlag";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isAccountSyncEnabled() || !isCompetitiveRankingEnabled()) return accountJson({ error: "COMPETITION_DISABLED" }, 503);
  if (rejectCrossSiteMutation(request)) return accountJson({ error: "CROSS_SITE_REQUEST" }, 403);
  try {
    const account = await getAuthenticatedAccount(request);
    await requireOnboardedAccount(account.userId);
    const body = await readBoundedJson(request, 2048);
    assertAllowedKeys(body, ["expectedUserId", "roundId", "index", "pickedId"]);
    requireExpectedUser(body, account.userId);
    if (!isUUID(body.roundId) ||
      !Number.isSafeInteger(body.index) || !Number.isSafeInteger(body.pickedId)) {
      throw new AccountError(400, "INVALID_ANSWER");
    }
    const limited = await enforceAccountRateLimit([
      { scope: "competitive-answer-user-minute", subject: account.userId, windowSeconds: 60, maxRequests: 90 },
    ]);
    if (limited) return limited;
    return accountJson(await submitCompetitiveAnswer(account.userId, String(body.roundId), Number(body.index), Number(body.pickedId)));
  } catch (error) {
    return accountErrorResponse(error);
  }
}
