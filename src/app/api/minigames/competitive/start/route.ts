import { rejectCrossSiteMutation } from "../../../../../server/requestGuard";
import { AccountError, assertAllowedKeys, getAuthenticatedAccount, readBoundedJson, requireExpectedUser, requireOnboardedAccount } from "../../../../../server/account";
import { accountErrorResponse, accountJson, enforceAccountRateLimit, getTrustedRequestSubject } from "../../../../../server/accountHttp";
import { isAccountSyncEnabled } from "../../../../../server/auth";
import { parseCompetitiveGame, startCompetitiveRound } from "../../../../../server/competitiveComparison";
import { isCompetitiveRankingEnabled } from "../../../../../server/competitiveFlag";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isAccountSyncEnabled() || !isCompetitiveRankingEnabled()) return accountJson({ error: "COMPETITION_DISABLED" }, 503);
  if (rejectCrossSiteMutation(request)) return accountJson({ error: "CROSS_SITE_REQUEST" }, 403);
  try {
    const account = await getAuthenticatedAccount(request);
    await requireOnboardedAccount(account.userId);
    const body = await readBoundedJson(request, 2048);
    assertAllowedKeys(body, ["expectedUserId", "gameId", "publicAliasConsent"]);
    requireExpectedUser(body, account.userId);
    if (body.publicAliasConsent !== true) throw new AccountError(400, "CONSENT_REQUIRED");
    const game = parseCompetitiveGame(body.gameId);
    const limited = await enforceAccountRateLimit([
      { scope: "competitive-start-user-hour", subject: account.userId, windowSeconds: 3600, maxRequests: 20 },
      { scope: "competitive-start-ip-minute", subject: getTrustedRequestSubject(request), windowSeconds: 60, maxRequests: 80 },
    ]);
    if (limited) return limited;
    return accountJson(await startCompetitiveRound(account.userId, game));
  } catch (error) {
    return accountErrorResponse(error);
  }
}
