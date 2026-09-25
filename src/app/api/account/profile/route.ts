import { rejectCrossSiteMutation } from "../../../../server/requestGuard";
import {
  assertAllowedKeys,
  getAuthenticatedAccount,
  readBoundedJson,
  requireExpectedUser,
  requireOnboardedAccount,
  updateAccountProfile,
} from "../../../../server/account";
import {
  accountErrorResponse,
  accountJson,
  enforceAccountRateLimit,
} from "../../../../server/accountHttp";
import { areAccountsEnabled } from "../../../../server/auth";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  if (!areAccountsEnabled()) return accountJson({ error: "ACCOUNTS_DISABLED" }, 404);
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return accountJson({ error: "CROSS_SITE_REQUEST" }, 403);

  try {
    const account = await getAuthenticatedAccount(request);
    const body = await readBoundedJson(request);
    assertAllowedKeys(body, [
      "expectedUserId",
      "expectedRevision",
      "nickname",
      "defaultPlayerTag",
    ]);
    requireExpectedUser(body, account.userId);
    await requireOnboardedAccount(account.userId);
    const limited = await enforceAccountRateLimit([
      {
        scope: "profile-user",
        subject: account.userId,
        windowSeconds: 60,
        maxRequests: 10,
      },
    ]);
    if (limited) return limited;
    return accountJson({ account: await updateAccountProfile(account.userId, body) });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
