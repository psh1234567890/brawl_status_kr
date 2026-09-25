import { toNextJsHandler } from "better-auth/next-js";
import { rejectCrossSiteMutation } from "../../../../server/requestGuard";
import {
  AccountError,
  assertAllowedKeys,
  readBoundedJson,
} from "../../../../server/account";
import {
  accountErrorResponse,
  accountJson,
  accountUnavailableResponse,
  enforceAccountRateLimit,
  getTrustedRequestSubject,
} from "../../../../server/accountHttp";
import {
  clearDeletionCookie,
  finishDeletionCallback,
  getDeletionCookieValue,
  markDeletionReauthStarted,
  requirePendingDeletionReauth,
  verifyDeletionCallback,
} from "../../../../server/accountDeletion";
import {
  areAccountsEnabled,
  getAuth,
  getDeletionAuth,
  isAccountDeletionOnlyEnabled,
} from "../../../../server/auth";
import { isLocale } from "../../../../i18n/config";

export const runtime = "nodejs";

function requestPath(request: Request) {
  return new URL(request.url).pathname.replace(/\/+$/, "");
}

function isSafeAccountCallback(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 64) return false;
  if (/[%\\\u0000-\u001f\u007f]/u.test(value) || value.includes("?") || value.includes("#")) {
    return false;
  }
  if (value === "/account") return true;
  const match = /^\/([a-z-]+)\/account$/.exec(value);
  return Boolean(match && isLocale(match[1]));
}

async function safeSocialSignInRequest(request: Request, deletionReauth: boolean) {
  const body = await readBoundedJson(request, 8 * 1024);
  assertAllowedKeys(body, [
    "provider",
    "callbackURL",
    "errorCallbackURL",
    "newUserCallbackURL",
    "disableRedirect",
  ]);
  if (body.provider !== "google") throw new AccountError(400, "GOOGLE_ONLY");

  const cleanBody: Record<string, unknown> = { provider: "google" };
  for (const key of ["callbackURL", "errorCallbackURL", "newUserCallbackURL"] as const) {
    const value = body[key];
    if (value === undefined) continue;
    if (!isSafeAccountCallback(value)) throw new AccountError(400, "INVALID_CALLBACK");
    cleanBody[key] = value;
  }
  if (body.disableRedirect !== undefined) {
    if (typeof body.disableRedirect !== "boolean") {
      throw new AccountError(400, "INVALID_REQUEST");
    }
    cleanBody.disableRedirect = body.disableRedirect;
  }
  if (deletionReauth) {
    cleanBody.additionalParams = { prompt: "select_account", max_age: "0" };
  }

  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  return new Request(request.url, {
    method: "POST",
    headers,
    body: JSON.stringify(cleanBody),
  });
}

async function handle(request: Request, method: "GET" | "POST") {
  const path = requestPath(request);
  const isCallback = path.endsWith("/api/auth/callback/google");
  const isSocialSignIn = path.endsWith("/api/auth/sign-in/social");
  const isSignOut = path.endsWith("/api/auth/sign-out");
  const deletionOnlyRollback = isAccountDeletionOnlyEnabled();
  if (
    (method === "GET" && !isCallback) ||
    (method === "POST" && !isSocialSignIn && !isSignOut)
  ) {
    return accountJson({ error: "AUTH_ROUTE_NOT_ALLOWED" }, 404);
  }

  if (method === "POST") {
    const rejected = rejectCrossSiteMutation(request);
    if (rejected) return accountJson({ error: "CROSS_SITE_REQUEST" }, 403);
  }

  if (isSignOut) {
    try {
      const handlers = toNextJsHandler(getAuth());
      const response = await handlers.POST(request);
      response.headers.set("Cache-Control", "private, no-store");
      return clearDeletionCookie(response);
    } catch {
      return accountUnavailableResponse();
    }
  }

  if (isSocialSignIn) {
    const hasDeletionTicket = getDeletionCookieValue(request) !== null;
    if (deletionOnlyRollback && !hasDeletionTicket) {
      return accountJson({ error: "ACCOUNTS_DISABLED" }, 404);
    }
    if (!deletionOnlyRollback && !areAccountsEnabled()) {
      return accountJson({ error: "ACCOUNTS_DISABLED" }, 404);
    }

    let deletionFlow = false;
    if (hasDeletionTicket) {
      try {
        await requirePendingDeletionReauth(request);
        deletionFlow = true;
      } catch (error) {
        return accountErrorResponse(error);
      }
    }

    let safeRequest: Request;
    try {
      safeRequest = await safeSocialSignInRequest(request, deletionFlow);
    } catch (error) {
      return accountErrorResponse(error);
    }

    try {
      const limited = await enforceAccountRateLimit([
        {
          scope: "google-sign-in-ip",
          subject: getTrustedRequestSubject(request),
          windowSeconds: 10 * 60,
          maxRequests: 10,
        },
      ]);
      if (limited) return limited;
      if (!deletionFlow && await getAuth().api.getSession({ headers: safeRequest.headers })) {
        return accountJson({ error: "ALREADY_SIGNED_IN" }, 409);
      }
    } catch {
      return accountUnavailableResponse();
    }

    try {
      const auth = deletionFlow ? getDeletionAuth() : getAuth();
      const handlers = toNextJsHandler(auth);
      const response = await handlers.POST(safeRequest);
      if (deletionFlow && response.ok) {
        const payload = await response.clone().json().catch(() => null) as
          | { url?: unknown }
          | null;
        if (typeof payload?.url !== "string") {
          return accountJson({ error: "DELETION_REAUTH_REQUIRED" }, 503);
        }
        const authorizationURL = new URL(payload.url);
        const state = authorizationURL.searchParams.get("state");
        if (authorizationURL.hostname !== "accounts.google.com" || !state) {
          return accountJson({ error: "DELETION_REAUTH_REQUIRED" }, 503);
        }
        await markDeletionReauthStarted(request, state);
      }
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      if (error instanceof AccountError) return accountErrorResponse(error);
      return accountUnavailableResponse();
    }
  }

  const deletionTicket = getDeletionCookieValue(request) !== null;
  if (deletionOnlyRollback && !deletionTicket) {
    return accountJson({ error: "ACCOUNTS_DISABLED" }, 404);
  }
  if (!deletionOnlyRollback && !areAccountsEnabled()) {
    return accountJson({ error: "ACCOUNTS_DISABLED" }, 404);
  }

  let deletionIntent: Awaited<ReturnType<typeof verifyDeletionCallback>> | null = null;
  if (deletionTicket) {
    const state = new URL(request.url).searchParams.get("state");
    if (!state) return accountJson({ error: "DELETION_REAUTH_REQUIRED" }, 403);
    try {
      deletionIntent = await verifyDeletionCallback(request, state);
    } catch (error) {
      return accountErrorResponse(error);
    }
  }

  try {
    const auth = deletionIntent ? getDeletionAuth() : getAuth();
    const handlers = toNextJsHandler(auth);
    let response = await handlers.GET(request);
    if (deletionIntent) {
      response = await finishDeletionCallback(request, response, deletionIntent);
    }
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return accountUnavailableResponse();
  }
}

export async function GET(request: Request) {
  return handle(request, "GET");
}

export async function POST(request: Request) {
  return handle(request, "POST");
}
