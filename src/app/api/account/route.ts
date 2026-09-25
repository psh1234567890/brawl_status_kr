import { NextResponse } from "next/server";
import { rejectCrossSiteMutation } from "../../../server/requestGuard";
import {
  AccountError,
  assertAllowedKeys,
  deleteAccount,
  getAuthenticatedAccount,
  readBoundedJson,
  requireExpectedUser,
  readSafeAccount,
} from "../../../server/account";
import {
  getDeletionAccount,
  readDeletionReauthForCurrentSession,
  requireVerifiedDeletionProof,
  clearDeletionCookie,
} from "../../../server/accountDeletion";
import {
  accountErrorResponse,
  accountJson,
  enforceAccountRateLimit,
  getTrustedRequestSubject,
} from "../../../server/accountHttp";
import {
  areAccountsEnabled,
  isAccountDeletionOnlyEnabled,
  isAccountSyncEnabled,
} from "../../../server/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!areAccountsEnabled()) {
    if (!isAccountDeletionOnlyEnabled()) {
      return accountJson({ state: "disabled", syncEnabled: false });
    }
    try {
      const ipLimited = await enforceAccountRateLimit([
        {
          scope: "account-get-ip",
          subject: getTrustedRequestSubject(request),
          windowSeconds: 60,
          maxRequests: 300,
        },
      ]);
      if (ipLimited) return ipLimited;
      const deletion = await readDeletionReauthForCurrentSession(request);
      const userLimited = await enforceAccountRateLimit([
        {
          scope: "account-get-user",
          subject: deletion.account.userId,
          windowSeconds: 60,
          maxRequests: 120,
        },
      ]);
      if (userLimited) return userLimited;
      return accountJson({
        state: "deletion-only",
        syncEnabled: false,
        deletionUserId: deletion.account.userId,
        deletionReauthReady: deletion.ready,
      });
    } catch (error) {
      if (error instanceof AccountError &&
          error.status === 401) {
        return accountJson({
          state: "deletion-only",
          syncEnabled: false,
          deletionUserId: null,
          deletionReauthReady: false,
        });
      }
      if (error instanceof AccountError && error.status === 403) {
        return accountJson({ state: "disabled", syncEnabled: false });
      }
      return accountErrorResponse(error);
    }
  }

  try {
    const ipLimited = await enforceAccountRateLimit([
      {
        scope: "account-get-ip",
        subject: getTrustedRequestSubject(request),
        windowSeconds: 60,
        maxRequests: 300,
      },
    ]);
    if (ipLimited) return ipLimited;

    let account;
    try {
      account = await getAuthenticatedAccount(request);
    } catch (error) {
      if (
        error instanceof AccountError &&
        (error.status === 401 || error.code === "PILOT_ACCESS_REQUIRED")
      ) {
        return accountJson({ state: "guest", syncEnabled: false });
      }
      throw error;
    }

    const userLimited = await enforceAccountRateLimit([
      {
        scope: "account-get-user",
        subject: account.userId,
        windowSeconds: 60,
        maxRequests: 120,
      },
    ]);
    if (userLimited) return userLimited;
    const deletion = await readDeletionReauthForCurrentSession(request);
    return accountJson({
      state: "account",
      syncEnabled: isAccountSyncEnabled(),
      deletionReauthReady: deletion.ready,
      account: await readSafeAccount(account.userId),
    });
  } catch (error) {
    return accountErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const deletionOnlyRollback = isAccountDeletionOnlyEnabled();
  if (!areAccountsEnabled() && !deletionOnlyRollback) {
    return accountJson({ error: "ACCOUNTS_DISABLED" }, 404);
  }
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return accountJson({ error: "CROSS_SITE_REQUEST" }, 403);

  try {
    const body = await readBoundedJson(request);
    assertAllowedKeys(body, ["expectedUserId", "confirmation"]);
    const account = deletionOnlyRollback
      ? await getDeletionAccount(
          request,
          typeof body.expectedUserId === "string" ? body.expectedUserId : undefined,
        )
      : await getAuthenticatedAccount(request);
    requireExpectedUser(body, account.userId);
    const proof = await requireVerifiedDeletionProof(request, account);
    const limited = await enforceAccountRateLimit([
      {
        scope: "account-delete-user",
        subject: account.userId,
        windowSeconds: 60 * 60,
        maxRequests: 3,
      },
    ]);
    if (limited) return limited;
    await deleteAccount(account, body.confirmation, proof);

    const secure = process.env.BETTER_AUTH_URL?.startsWith("https://") === true;
    const response = NextResponse.json(
      { deleted: true },
      { headers: { "Cache-Control": "private, no-store", Pragma: "no-cache" } },
    );
    for (const name of ["better-auth.session_token", "__Secure-better-auth.session_token"]) {
      response.cookies.set(name, "", {
        httpOnly: true,
        secure: secure && name.startsWith("__Secure-"),
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }
    return clearDeletionCookie(response);
  } catch (error) {
    return accountErrorResponse(error);
  }
}
