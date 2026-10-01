import { rejectCrossSiteMutation } from "../../../../server/requestGuard";
import {
  assertAllowedKeys,
  getAuthenticatedAccount,
  readBoundedJson,
  requireExpectedUser,
  updateAccountOnboarding,
} from "../../../../server/account";
import {
  accountErrorResponse,
  accountJson,
  enforceAccountRateLimit,
} from "../../../../server/accountHttp";
import { areAccountsEnabled } from "../../../../server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!areAccountsEnabled()) return accountJson({ error: "ACCOUNTS_DISABLED" }, 404);
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return accountJson({ error: "CROSS_SITE_REQUEST" }, 403);

  try {
    const account = await getAuthenticatedAccount(request);
    const body = await readBoundedJson(request);
    assertAllowedKeys(body, [
      "expectedUserId",
      "acceptTerms",
      "acknowledgePrivacy",
      "confirmEligibility",
    ]);
    requireExpectedUser(body, account.userId);
    const limited = await enforceAccountRateLimit([
      {
        scope: "onboarding-user",
        subject: account.userId,
        windowSeconds: 60,
        maxRequests: 10,
      },
    ]);
    if (limited) return limited;
    const updated = await updateAccountOnboarding(account.userId, body);
    return accountJson({ account: updated });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
