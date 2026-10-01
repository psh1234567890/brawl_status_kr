import { rejectCrossSiteMutation } from "../../../../../server/requestGuard";
import {
  AccountError,
  assertAllowedKeys,
  getAuthenticatedAccount,
  isUUID,
  readBoundedJson,
  requireExpectedUser,
  requireOnboardedAccount,
} from "../../../../../server/account";
import {
  accountErrorResponse,
  accountJson,
  enforceAccountRateLimit,
  getTrustedRequestSubject,
} from "../../../../../server/accountHttp";
import {
  areAccountsEnabled,
  isAccountSyncEnabled,
} from "../../../../../server/auth";
import {
  mergePersonalBests,
  parsePersonalBestCandidates,
} from "../../../../../server/minigameBests";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!areAccountsEnabled()) return accountJson({ error: "ACCOUNTS_DISABLED" }, 404);
  if (!isAccountSyncEnabled()) {
    return accountJson({ error: "ACCOUNT_SYNC_DISABLED" }, 503);
  }
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return accountJson({ error: "CROSS_SITE_REQUEST" }, 403);

  try {
    const account = await getAuthenticatedAccount(request);
    const body = await readBoundedJson(request, 16 * 1024);
    assertAllowedKeys(body, [
      "operationId",
      "expectedUserId",
      "rulesetVersion",
      "candidates",
    ]);
    requireExpectedUser(body, account.userId);
    if (!isUUID(body.operationId)) {
      throw new AccountError(400, "INVALID_OPERATION_ID");
    }
    if (body.rulesetVersion !== 1) throw new AccountError(400, "INVALID_RULESET");
    const candidates = parsePersonalBestCandidates(body.candidates);
    if (candidates.some((candidate) => candidate.rulesetVersion !== body.rulesetVersion)) {
      throw new AccountError(400, "INVALID_RULESET");
    }
    await requireOnboardedAccount(account.userId);

    const limited = await enforceAccountRateLimit([
      {
        scope: "minigame-write-user-minute",
        subject: account.userId,
        windowSeconds: 60,
        maxRequests: 30,
      },
      {
        scope: "minigame-write-user-hour",
        subject: account.userId,
        windowSeconds: 60 * 60,
        maxRequests: 300,
      },
      {
        scope: "minigame-write-ip",
        subject: getTrustedRequestSubject(request),
        windowSeconds: 60,
        maxRequests: 600,
      },
    ]);
    if (limited) return limited;

    return accountJson({
      personalBests: await mergePersonalBests(
        account,
        body.operationId,
        "legacy_import",
        candidates,
      ),
    });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
