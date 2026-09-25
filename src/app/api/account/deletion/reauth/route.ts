import { NextResponse } from "next/server";
import { isLocale } from "../../../../../i18n/config";
import {
  AccountError,
  assertAllowedKeys,
  isUUID,
  readBoundedJson,
} from "../../../../../server/account";
import {
  createDeletionReauthIntent,
  deletionCookieOptions,
  getDeletionAccount,
} from "../../../../../server/accountDeletion";
import {
  accountErrorResponse,
  accountJson,
  enforceAccountRateLimit,
  getTrustedRequestSubject,
} from "../../../../../server/accountHttp";
import {
  areAccountsEnabled,
  isAccountDeletionOnlyEnabled,
} from "../../../../../server/auth";
import { rejectCrossSiteMutation } from "../../../../../server/requestGuard";

export const runtime = "nodejs";

function isSafeAccountCallback(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 64) return false;
  if (/[%\\\u0000-\u001f\u007f]/u.test(value) || value.includes("?") || value.includes("#")) {
    return false;
  }
  if (value === "/account") return true;
  const match = /^\/([a-z-]+)\/account$/.exec(value);
  return Boolean(match && isLocale(match[1]));
}

export async function POST(request: Request) {
  if (!areAccountsEnabled() && !isAccountDeletionOnlyEnabled()) {
    return accountJson({ error: "ACCOUNTS_DISABLED" }, 404);
  }
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return accountJson({ error: "CROSS_SITE_REQUEST" }, 403);

  try {
    const body = await readBoundedJson(request, 8 * 1024);
    assertAllowedKeys(body, ["expectedUserId", "callbackURL"]);
    if (body.expectedUserId !== undefined && !isUUID(body.expectedUserId)) {
      throw new AccountError(400, "INVALID_USER_ID");
    }
    const expectedUserId = typeof body.expectedUserId === "string"
      ? body.expectedUserId
      : null;
    if (!expectedUserId && !isAccountDeletionOnlyEnabled()) {
      throw new AccountError(400, "INVALID_USER_ID");
    }
    const callbackURL = body.callbackURL ?? "/account";
    if (!isSafeAccountCallback(callbackURL)) throw new AccountError(400, "INVALID_CALLBACK");

    const account = expectedUserId
      ? await getDeletionAccount(request, expectedUserId)
      : null;
    const limited = await enforceAccountRateLimit(account ? [{
        scope: "account-delete-user",
        subject: account.userId,
        windowSeconds: 60 * 60,
        maxRequests: 3,
      }] : [{
        scope: "account-delete-discovery-ip",
        subject: getTrustedRequestSubject(request),
        windowSeconds: 60 * 60,
        maxRequests: 3,
      }]);
    if (limited) return limited;

    const intent = await createDeletionReauthIntent(request, expectedUserId, callbackURL);
    const response = NextResponse.json(
      { reauthenticationRequired: true },
      { headers: { "Cache-Control": "private, no-store", Pragma: "no-cache" } },
    );
    response.cookies.set(
      "brawl-account-deletion",
      intent.ticket,
      deletionCookieOptions(),
    );
    return response;
  } catch (error) {
    return accountErrorResponse(error);
  }
}
