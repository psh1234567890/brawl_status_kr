import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { AccountError, isUUID, type AuthenticatedAccount } from "./account";
import {
  areAccountsEnabled,
  getAuth,
  isAccountDeletionOnlyEnabled,
  isDeletionGoogleSubjectAllowed,
} from "./auth";

export const ACCOUNT_DELETION_COOKIE = "brawl-account-deletion";
const INTENT_PREFIX = "account-deletion:";
const INTENT_TTL_SECONDS = 5 * 60;

type IntentStatus = "pending" | "started" | "verified";

export type DeletionIntent = {
  flow: "existing-session" | "existing-account-discovery";
  userId: string | null;
  initiatingSessionId: string | null;
  googleSubject: string | null;
  callbackURL: string;
  originalSessionExpiresAt: string | null;
  status: IntentStatus;
  stateHash?: string;
  startedAt?: string;
  verifiedSessionId?: string;
  verifiedAt?: string;
};

export type DeletionProof = {
  verificationId: string;
  identifier: string;
  userId: string;
  initiatingSessionId: string | null;
  sessionId: string;
  googleSubject: string;
  startedAt: string;
  verifiedAt: string;
};

export function getDeletionCookieValue(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const item of cookieHeader.split(";")) {
    const pair = item.trim();
    const separator = pair.indexOf("=");
    if (separator < 0 || pair.slice(0, separator) !== ACCOUNT_DELETION_COOKIE) continue;
    const value = pair.slice(separator + 1);
    return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
  }
  return null;
}

export function deletionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.BETTER_AUTH_URL?.startsWith("https://") === true,
    sameSite: "lax" as const,
    path: "/api",
    maxAge: INTENT_TTL_SECONDS,
  };
}

export function clearDeletionCookie(response: Response) {
  return responseWithCookies(response, [
    `${ACCOUNT_DELETION_COOKIE}=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0${
      process.env.BETTER_AUTH_URL?.startsWith("https://") ? "; Secure" : ""
    }`,
  ]);
}

function ticketIdentifier(ticket: string) {
  return INTENT_PREFIX + createHash("sha256").update(ticket).digest("hex");
}

function hashState(value: string) {
  return createHash("sha256").update(value).digest();
}

function parseIntent(value: unknown): DeletionIntent | null {
  if (typeof value !== "string" || value.length > 4_096) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const intent = parsed as Record<string, unknown>;
  if (
    !["existing-session", "existing-account-discovery"].includes(String(intent.flow)) ||
    typeof intent.callbackURL !== "string" ||
    !["pending", "started", "verified"].includes(String(intent.status))
  ) return null;
  const boundIdentity = isUUID(intent.userId) &&
    typeof intent.initiatingSessionId === "string" &&
    intent.initiatingSessionId.length > 0 && intent.initiatingSessionId.length <= 128 &&
    typeof intent.googleSubject === "string" &&
    intent.googleSubject.length > 0 && intent.googleSubject.length <= 255 &&
    typeof intent.originalSessionExpiresAt === "string" &&
    Number.isFinite(Date.parse(intent.originalSessionExpiresAt));
  const unboundDiscovery = intent.flow === "existing-account-discovery" &&
    intent.userId === null && intent.initiatingSessionId === null &&
    intent.googleSubject === null && intent.originalSessionExpiresAt === null;
  const verifiedDiscovery = intent.flow === "existing-account-discovery" &&
    intent.status === "verified" && isUUID(intent.userId) &&
    intent.initiatingSessionId === null && typeof intent.googleSubject === "string" &&
    intent.googleSubject.length > 0 && intent.originalSessionExpiresAt === null;
  if (!boundIdentity && !unboundDiscovery && !verifiedDiscovery) return null;
  if (intent.status === "started" && (
    typeof intent.stateHash !== "string" ||
    !/^[0-9a-f]{64}$/.test(intent.stateHash) ||
    typeof intent.startedAt !== "string" || !Number.isFinite(Date.parse(intent.startedAt))
  )) return null;
  if (intent.status === "verified" && (
    typeof intent.stateHash !== "string" ||
    !/^[0-9a-f]{64}$/.test(intent.stateHash) ||
    typeof intent.startedAt !== "string" || !Number.isFinite(Date.parse(intent.startedAt)) ||
    typeof intent.verifiedSessionId !== "string" ||
    typeof intent.verifiedAt !== "string" || !Number.isFinite(Date.parse(intent.verifiedAt))
  )) return null;
  return intent as unknown as DeletionIntent;
}

async function readIntent(request: Request) {
  const ticket = getDeletionCookieValue(request);
  if (!ticket) return null;
  const identifier = ticketIdentifier(ticket);
  const result = await db.$client.query<{ id: string; value: string }>(
    "SELECT id, value FROM public.auth_verifications WHERE identifier = $1 AND expires_at > now() LIMIT 1",
    [identifier],
  );
  const row = result.rows[0];
  const intent = row ? parseIntent(row.value) : null;
  return row && intent ? { id: row.id, identifier, intent } : null;
}

export async function getDeletionAccount(
  request: Request,
  expectedUserId?: string,
): Promise<AuthenticatedAccount & { googleSubject: string; sessionExpiresAt: Date }> {
  let session;
  try {
    session = await getAuth().api.getSession({ headers: request.headers });
  } catch {
    throw new AccountError(503, "ACCOUNT_UNAVAILABLE");
  }
  if (!session || !isUUID(session.user.id)) throw new AccountError(401, "LOGIN_REQUIRED");
  if (expectedUserId && expectedUserId !== session.user.id) {
    throw new AccountError(403, "ACCOUNT_MISMATCH");
  }

  const identity = await db.$client.query<{ account_id: string }>(
    "SELECT account_id FROM public.auth_accounts WHERE user_id = $1 AND provider_id = 'google'",
    [session.user.id],
  );
  const googleSubject = identity.rows[0]?.account_id;
  if (!googleSubject || !isDeletionGoogleSubjectAllowed(googleSubject)) {
    throw new AccountError(403, "PILOT_ACCESS_REQUIRED");
  }

  return {
    userId: session.user.id,
    sessionId: session.session.id,
    sessionCreatedAt: new Date(session.session.createdAt),
    sessionExpiresAt: new Date(session.session.expiresAt),
    googleSubject,
  };
}

export async function createDeletionReauthIntent(
  request: Request,
  expectedUserId: string | null,
  callbackURL: string,
) {
  if (!areAccountsEnabled() && !isAccountDeletionOnlyEnabled()) {
    throw new AccountError(404, "ACCOUNTS_DISABLED");
  }
  const account = expectedUserId
    ? await getDeletionAccount(request, expectedUserId)
    : null;
  if (!account) {
    if (!isAccountDeletionOnlyEnabled()) throw new AccountError(404, "ACCOUNTS_DISABLED");
    try {
      if (await getAuth().api.getSession({ headers: request.headers })) {
        throw new AccountError(400, "EXPECTED_USER_REQUIRED");
      }
    } catch (error) {
      if (error instanceof AccountError) throw error;
      throw new AccountError(503, "ACCOUNT_UNAVAILABLE");
    }
  }
  const ticket = randomBytes(32).toString("base64url");
  const value: DeletionIntent = {
    flow: account ? "existing-session" : "existing-account-discovery",
    userId: account?.userId ?? null,
    initiatingSessionId: account?.sessionId ?? null,
    googleSubject: account?.googleSubject ?? null,
    callbackURL,
    originalSessionExpiresAt: account?.sessionExpiresAt.toISOString() ?? null,
    status: "pending",
  };
  await db.$client.query(
    "INSERT INTO public.auth_verifications (identifier, value, expires_at) VALUES ($1, $2, now() + interval '5 minutes')",
    [ticketIdentifier(ticket), JSON.stringify(value)],
  );
  return { ticket, account };
}

export async function readDeletionReauthForCurrentSession(request: Request) {
  const account = await getDeletionAccount(request);
  const stored = await readIntent(request);
  if (!stored || stored.intent.userId !== account.userId) return { account, ready: false };
  if (stored.intent.status !== "verified" ||
      stored.intent.verifiedSessionId !== account.sessionId ||
      stored.intent.googleSubject !== account.googleSubject) {
    return { account, ready: false };
  }
  const verifiedAt = Date.parse(stored.intent.verifiedAt!);
  if (Date.now() - verifiedAt > INTENT_TTL_SECONDS * 1_000 ||
      Date.now() < account.sessionCreatedAt.getTime() ||
      Date.now() - account.sessionCreatedAt.getTime() > INTENT_TTL_SECONDS * 1_000) {
    return { account, ready: false };
  }
  return { account, ready: true };
}

export async function requirePendingDeletionReauth(request: Request) {
  const stored = await readIntent(request);
  if (!stored || stored.intent.status !== "pending") {
    throw new AccountError(403, "DELETION_REAUTH_REQUIRED");
  }
  if (stored.intent.flow === "existing-account-discovery") {
    try {
      if (await getAuth().api.getSession({ headers: request.headers })) {
        throw new AccountError(403, "DELETION_REAUTH_REQUIRED");
      }
    } catch (error) {
      if (error instanceof AccountError) throw error;
      throw new AccountError(503, "ACCOUNT_UNAVAILABLE");
    }
    return stored;
  }
  const account = await getDeletionAccount(request);
  if (stored.intent.userId !== account.userId ||
      stored.intent.initiatingSessionId !== account.sessionId ||
      stored.intent.googleSubject !== account.googleSubject) {
    throw new AccountError(403, "DELETION_REAUTH_REQUIRED");
  }
  return stored;
}

export async function markDeletionReauthStarted(request: Request, state: string) {
  const stored = await requirePendingDeletionReauth(request);
  const intent: DeletionIntent = {
    ...stored.intent,
    status: "started",
    stateHash: hashState(state).toString("hex"),
    startedAt: new Date().toISOString(),
  };
  const updated = await db.$client.query(
    "UPDATE public.auth_verifications SET value = $2, updated_at = now() WHERE id = $1 AND expires_at > now()",
    [stored.id, JSON.stringify(intent)],
  );
  if (!updated.rowCount) throw new AccountError(403, "DELETION_REAUTH_REQUIRED");
  return { ...stored, intent };
}

export async function verifyDeletionCallback(request: Request, state: string) {
  const stored = await readIntent(request);
  if (!stored || stored.intent.status !== "started" || !stored.intent.stateHash) {
    throw new AccountError(403, "DELETION_REAUTH_REQUIRED");
  }
  if (stored.intent.flow === "existing-account-discovery") {
    try {
      if (await getAuth().api.getSession({ headers: request.headers })) {
        throw new AccountError(403, "DELETION_REAUTH_REQUIRED");
      }
    } catch (error) {
      if (error instanceof AccountError) throw error;
      throw new AccountError(503, "ACCOUNT_UNAVAILABLE");
    }
  } else {
    const account = await getDeletionAccount(request);
    if (stored.intent.userId !== account.userId ||
        stored.intent.initiatingSessionId !== account.sessionId ||
        stored.intent.googleSubject !== account.googleSubject) {
      throw new AccountError(403, "DELETION_REAUTH_REQUIRED");
    }
  }
  const expected = Buffer.from(stored.intent.stateHash, "hex");
  const received = hashState(state);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new AccountError(403, "DELETION_REAUTH_REQUIRED");
  }
  return stored;
}

function getSetCookieHeaders(headers: Headers) {
  const extended = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof extended.getSetCookie === "function") return extended.getSetCookie();
  const combined = headers.get("set-cookie");
  return combined ? [combined] : [];
}

function getSessionCookie(headers: Headers) {
  for (const cookie of getSetCookieHeaders(headers)) {
    const pair = cookie.split(";", 1)[0];
    if (pair.startsWith("better-auth.session_token=") ||
        pair.startsWith("__Secure-better-auth.session_token=")) {
      const separator = pair.indexOf("=");
      return { name: pair.slice(0, separator), value: pair.slice(separator + 1) };
    }
  }
  return null;
}

function getRequestSessionCookie(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const item of cookieHeader.split(";")) {
    const pair = item.trim();
    const separator = pair.indexOf("=");
    const name = pair.slice(0, separator);
    if (separator > 0 && (name === "better-auth.session_token" ||
        name === "__Secure-better-auth.session_token")) {
      return { name, value: pair.slice(separator + 1) };
    }
  }
  return null;
}

function responseWithCookies(response: Response, extraCookies: string[]) {
  const headers = new Headers();
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") headers.append(key, value);
  });
  for (const cookie of getSetCookieHeaders(response.headers)) headers.append("Set-Cookie", cookie);
  for (const cookie of extraCookies) headers.append("Set-Cookie", cookie);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function restoredSessionCookie(cookie: { name: string; value: string }, expiresAt: Date) {
  const remainingSeconds = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1_000));
  return `${cookie.name}=${cookie.value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${remainingSeconds}${
    cookie.name.startsWith("__Secure-") ? "; Secure" : ""
  }`;
}

export async function finishDeletionCallback(
  request: Request,
  response: Response,
  stored: { id: string; identifier: string; intent: DeletionIntent },
) {
  const newCookie = getSessionCookie(response.headers);
  if (!newCookie) return response;

  let session;
  try {
    session = await getAuth().api.getSession({
      headers: new Headers({ cookie: `${newCookie.name}=${newCookie.value}` }),
    });
  } catch {
    return response;
  }
  if (!session) return response;
  const identity = await db.$client.query<{ account_id: string }>(
    "SELECT account_id FROM public.auth_accounts WHERE user_id = $1 AND provider_id = 'google'",
    [session.user.id],
  );
  const sameIdentity = stored.intent.flow === "existing-account-discovery"
    ? isUUID(session.user.id) && typeof identity.rows[0]?.account_id === "string" &&
      isDeletionGoogleSubjectAllowed(identity.rows[0].account_id)
    : session.user.id === stored.intent.userId &&
      identity.rows[0]?.account_id === stored.intent.googleSubject;
  const startedAt = Date.parse(stored.intent.startedAt ?? "");
  const sessionCreatedAt = new Date(session.session.createdAt).getTime();
  const freshSession = (!stored.intent.initiatingSessionId ||
    session.session.id !== stored.intent.initiatingSessionId) &&
    Number.isFinite(startedAt) && sessionCreatedAt >= startedAt &&
    Date.now() - sessionCreatedAt <= INTENT_TTL_SECONDS * 1_000;
  if (!sameIdentity || !freshSession) {
    await db.$client.query(
      "DELETE FROM public.auth_sessions WHERE id = $1 AND user_id = $2",
      [session.session.id, session.user.id],
    );
    await db.$client.query("DELETE FROM public.auth_verifications WHERE id = $1", [stored.id]);
    const original = getRequestSessionCookie(request);
    const secure = process.env.BETTER_AUTH_URL?.startsWith("https://") === true;
    const restore = original
      ? [restoredSessionCookie(original, new Date(stored.intent.originalSessionExpiresAt!))]
      : [];
    const mismatchURL = new URL(stored.intent.callbackURL, process.env.BETTER_AUTH_URL);
    mismatchURL.searchParams.set("accountDeletion", "account-mismatch");
    const mismatch = new Response(null, {
      status: 303,
      headers: {
        Location: mismatchURL.toString(),
        "Cache-Control": "private, no-store",
      },
    });
    return responseWithCookies(mismatch, [
      ...getSetCookieHeaders(response.headers),
      `${newCookie.name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`,
      ...restore,
      `${ACCOUNT_DELETION_COOKIE}=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`,
    ]);
  }

  const verified: DeletionIntent = {
    ...stored.intent,
    userId: session.user.id,
    googleSubject: identity.rows[0]?.account_id ?? null,
    status: "verified",
    verifiedSessionId: session.session.id,
    verifiedAt: new Date().toISOString(),
  };
  await db.$client.query(
    "UPDATE public.auth_verifications SET value = $2, updated_at = now() WHERE id = $1 AND expires_at > now()",
    [stored.id, JSON.stringify(verified)],
  );
  return response;
}

export async function requireVerifiedDeletionProof(
  request: Request,
  account: AuthenticatedAccount,
): Promise<DeletionProof> {
  const stored = await readIntent(request);
  const identity = await db.$client.query<{ account_id: string }>(
    "SELECT account_id FROM public.auth_accounts WHERE user_id = $1 AND provider_id = 'google'",
    [account.userId],
  );
  const intent = stored?.intent;
  const now = Date.now();
  if (
    !stored || !intent || intent.status !== "verified" ||
    intent.userId !== account.userId || intent.verifiedSessionId !== account.sessionId ||
    intent.googleSubject !== identity.rows[0]?.account_id ||
    !isDeletionGoogleSubjectAllowed(intent.googleSubject) ||
    !intent.startedAt || !intent.verifiedAt ||
    now - Date.parse(intent.verifiedAt) > INTENT_TTL_SECONDS * 1_000 ||
    now - account.sessionCreatedAt.getTime() > INTENT_TTL_SECONDS * 1_000
  ) {
    throw new AccountError(403, "FRESH_GOOGLE_SIGN_IN_REQUIRED");
  }
  return {
    verificationId: stored.id,
    identifier: stored.identifier,
    userId: intent.userId,
    initiatingSessionId: intent.initiatingSessionId,
    sessionId: intent.verifiedSessionId,
    googleSubject: intent.googleSubject,
    startedAt: intent.startedAt,
    verifiedAt: intent.verifiedAt,
  };
}
