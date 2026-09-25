import { rejectCrossSiteMutation } from "../../../../server/requestGuard";
import {
  AccountError,
  assertAllowedKeys,
  getAuthenticatedAccount,
  isUUID,
  readBoundedJson,
  requireExpectedUser,
  requireOnboardedAccount,
} from "../../../../server/account";
import {
  accountErrorResponse,
  accountJson,
  enforceAccountRateLimit,
  getTrustedRequestSubject,
} from "../../../../server/accountHttp";
import {
  areAccountsEnabled,
  isAccountSyncEnabled,
} from "../../../../server/auth";
import {
  mergePersonalBests,
  parsePersonalBestCandidates,
  readPersonalBests,
} from "../../../../server/minigameBests";

export const runtime = "nodejs";

function syncDisabled() {
  return accountJson({ error: "ACCOUNT_SYNC_DISABLED" }, 503);
}

export async function GET(request: Request) {
  if (!areAccountsEnabled()) return accountJson({ error: "ACCOUNTS_DISABLED" }, 404);
  if (!isAccountSyncEnabled()) return syncDisabled();
  try {
    const account = await getAuthenticatedAccount(request);
    await requireOnboardedAccount(account.userId);
    const limited = await enforceAccountRateLimit([
      {
        scope: "minigame-read-user",
        subject: account.userId,
        windowSeconds: 60,
        maxRequests: 120,
      },
      {
        scope: "minigame-read-ip",
        subject: getTrustedRequestSubject(request),
        windowSeconds: 60,
        maxRequests: 600,
      },
    ]);
    if (limited) return limited;
    return accountJson({ personalBests: await readPersonalBests(account.userId) });
  } catch (error) {
    return accountErrorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!areAccountsEnabled()) return accountJson({ error: "ACCOUNTS_DISABLED" }, 404);
  if (!isAccountSyncEnabled()) return syncDisabled();
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return accountJson({ error: "CROSS_SITE_REQUEST" }, 403);

  try {
    const account = await getAuthenticatedAccount(request);
    const body = await readBoundedJson(request);
    assertAllowedKeys(body, [
      "operationId",
      "expectedUserId",
      "rulesetVersion",
      "candidate",
    ]);
    requireExpectedUser(body, account.userId);
    if (!isUUID(body.operationId)) {
      throw new AccountError(400, "INVALID_OPERATION_ID");
    }
    const candidates = parsePersonalBestCandidates([body.candidate]);
    if (body.rulesetVersion !== 1 || candidates[0].rulesetVersion !== 1) {
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
        "client_play",
        candidates,
      ),
    });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
