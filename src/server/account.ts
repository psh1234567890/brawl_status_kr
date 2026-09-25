import "server-only";

import { db } from "../db";
import { isValidPlayerTag, normalizePlayerTag } from "../utils/playerTag";
import {
  areAccountsEnabled,
  getAccountBackupRetentionPolicyVersion,
  getAccountBackupRetentionPolicy,
  getAccountEligibilityPolicyTexts,
  getAccountEligibilityRules,
  getAccountPolicyVersions,
  getAccountsMode,
  getAuth,
  isDeletionGoogleSubjectAllowed,
  isPilotGoogleSubjectAllowed,
} from "./auth";
import {
  ACCOUNT_USER_RATE_LIMIT_SCOPES,
  hashAccountRateLimitSubject,
} from "./accountRateLimit";

export class AccountError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(code);
  }
}

export type AuthenticatedAccount = {
  userId: string;
  sessionId: string;
  sessionCreatedAt: Date;
};

export type SafeAccount = {
  id: string;
  nickname: string;
  defaultPlayerTag: string | null;
  profileRevision: number;
  onboardingCompletedAt: string | null;
  onboardingComplete: boolean;
  policyReady: boolean;
  eligibilityPolicyTexts: Record<"ko" | "en" | "ja" | "pt-br" | "es" | "tr" | "de" | "fr" | "it" | "ru", string> | null;
  eligibilityRules: ReturnType<typeof getAccountEligibilityRules>;
  policyVersions: ReturnType<typeof getAccountPolicyVersions>;
};

export async function readBoundedJson(
  request: Request,
  maxBytes = 16 * 1024,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new AccountError(415, "JSON_REQUIRED");
  }
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new AccountError(413, "BODY_TOO_LARGE");
  }

  if (!request.body) throw new AccountError(400, "INVALID_BODY");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new AccountError(413, "BODY_TOO_LARGE");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new AccountError(400, "INVALID_BODY");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AccountError(400, "INVALID_BODY");
  }
  return parsed as Record<string, unknown>;
}

export function assertAllowedKeys(
  body: Record<string, unknown>,
  keys: readonly string[],
) {
  const allowed = new Set(keys);
  if (Object.keys(body).some((key) => !allowed.has(key))) {
    throw new AccountError(400, "UNKNOWN_FIELD");
  }
}

export function requireExpectedUser(body: Record<string, unknown>, userId: string) {
  if (body.expectedUserId !== userId) {
    throw new AccountError(403, "ACCOUNT_MISMATCH");
  }
}

function normalizeNickname(value: unknown) {
  if (typeof value !== "string") throw new AccountError(400, "INVALID_NICKNAME");
  const nickname = value.normalize("NFKC").trim();
  const codePoints = [...nickname].length;
  if (
    codePoints < 1 ||
    codePoints > 32 ||
    Buffer.byteLength(nickname, "utf8") > 128 ||
    /[\p{Cc}\p{Cf}\p{Cs}]/u.test(nickname)
  ) {
    throw new AccountError(400, "INVALID_NICKNAME");
  }
  return nickname;
}

function accountIsOnboarded(
  row: {
    onboarding_completed_at: Date | null;
    terms_version: string | null;
    privacy_notice_version: string | null;
    eligibility_policy_version: string | null;
  },
  required: ReturnType<typeof getAccountPolicyVersions>,
) {
  return Boolean(
    required &&
      getAccountEligibilityPolicyTexts() &&
      getAccountEligibilityRules() &&
      getAccountBackupRetentionPolicyVersion() &&
      row.onboarding_completed_at &&
      row.terms_version === required.terms &&
      row.privacy_notice_version === required.privacy &&
      row.eligibility_policy_version === required.eligibility,
  );
}

async function isAllowedAccountUser(userId: string) {
  if (getAccountsMode() === "on") return true;
  if (getAccountsMode() !== "pilot") return false;

  const allowlist = (process.env.GOOGLE_PILOT_SUBJECT_ALLOWLIST ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);
  if (allowlist.length === 0) return false;
  const result = await db.$client.query<{ account_id: string }>(
    "SELECT account_id FROM public.auth_accounts WHERE user_id = $1 AND provider_id = 'google'",
    [userId],
  );
  return result.rows.some((row) => isPilotGoogleSubjectAllowed(row.account_id));
}

export async function getAuthenticatedAccount(
  request: Request,
  expectedUserId?: string,
): Promise<AuthenticatedAccount> {
  if (!areAccountsEnabled()) throw new AccountError(404, "ACCOUNTS_DISABLED");

  let session;
  try {
    session = await getAuth().api.getSession({ headers: request.headers });
  } catch {
    throw new AccountError(503, "ACCOUNT_UNAVAILABLE");
  }
  if (!session) throw new AccountError(401, "LOGIN_REQUIRED");

  const userId = session.user.id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    throw new AccountError(401, "LOGIN_REQUIRED");
  }
  if (expectedUserId !== undefined && expectedUserId !== userId) {
    throw new AccountError(403, "ACCOUNT_MISMATCH");
  }
  if (!(await isAllowedAccountUser(userId))) {
    throw new AccountError(403, "PILOT_ACCESS_REQUIRED");
  }

  return {
    userId,
    sessionId: session.session.id,
    sessionCreatedAt: new Date(session.session.createdAt),
  };
}

export async function requireOnboardedAccount(userId: string) {
  const result = await db.$client.query(
    "SELECT onboarding_completed_at, terms_version, privacy_notice_version, eligibility_policy_version FROM public.auth_users WHERE id = $1",
    [userId],
  );
  const row = result.rows[0];
  if (!row) throw new AccountError(404, "ACCOUNT_NOT_FOUND");
  if (!accountIsOnboarded(row, getAccountPolicyVersions())) {
    throw new AccountError(428, "ONBOARDING_REQUIRED");
  }
}

export async function readSafeAccount(userId: string): Promise<SafeAccount> {
  const policyVersions = getAccountPolicyVersions();
  const result = await db.$client.query(
    "SELECT id, name, default_player_tag, profile_revision, onboarding_completed_at, terms_version, privacy_notice_version, eligibility_policy_version FROM public.auth_users WHERE id = $1",
    [userId],
  );
  const row = result.rows[0];
  if (!row) throw new AccountError(404, "ACCOUNT_NOT_FOUND");
  return {
    id: row.id,
    nickname: row.name,
    defaultPlayerTag: row.default_player_tag,
    profileRevision: Number(row.profile_revision),
    onboardingCompletedAt: row.onboarding_completed_at
      ? new Date(row.onboarding_completed_at).toISOString()
      : null,
    onboardingComplete: accountIsOnboarded(row, policyVersions),
    policyReady: policyVersions !== null &&
      getAccountEligibilityPolicyTexts() !== null &&
      getAccountEligibilityRules() !== null &&
      getAccountBackupRetentionPolicyVersion() !== null,
    eligibilityPolicyTexts: getAccountEligibilityPolicyTexts(),
    eligibilityRules: getAccountEligibilityRules(),
    policyVersions,
  };
}

export async function updateAccountOnboarding(
  userId: string,
  body: Record<string, unknown>,
) {
  const policyVersions = getAccountPolicyVersions();
  if (
    !policyVersions ||
    !getAccountEligibilityPolicyTexts() ||
    !getAccountEligibilityRules() ||
    !getAccountBackupRetentionPolicyVersion()
  ) {
    throw new AccountError(503, "POLICY_NOT_CONFIGURED");
  }
  if (
    body.acceptTerms !== true ||
    body.acknowledgePrivacy !== true ||
    body.confirmEligibility !== true
  ) {
    throw new AccountError(400, "ACKNOWLEDGEMENT_REQUIRED");
  }

  const client = await db.$client.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      "SELECT id FROM public.auth_users WHERE id = $1 FOR UPDATE",
      [userId],
    );
    if (!locked.rowCount) throw new AccountError(404, "ACCOUNT_NOT_FOUND");
    await client.query(
      "UPDATE public.auth_users SET onboarding_completed_at = now(), terms_version = $2, privacy_notice_version = $3, eligibility_policy_version = $4, updated_at = now() WHERE id = $1",
      [userId, policyVersions.terms, policyVersions.privacy, policyVersions.eligibility],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  return readSafeAccount(userId);
}

export async function updateAccountProfile(
  userId: string,
  body: Record<string, unknown>,
) {
  const nickname = normalizeNickname(body.nickname);
  let defaultPlayerTag: string | null = null;
  if (body.defaultPlayerTag !== null) {
    if (typeof body.defaultPlayerTag !== "string") {
      throw new AccountError(400, "INVALID_PLAYER_TAG");
    }
    defaultPlayerTag = normalizePlayerTag(body.defaultPlayerTag);
    if (!isValidPlayerTag(defaultPlayerTag)) {
      throw new AccountError(400, "INVALID_PLAYER_TAG");
    }
  }

  const expectedRevision = body.expectedRevision;
  if (!Number.isSafeInteger(expectedRevision) || Number(expectedRevision) < 1) {
    throw new AccountError(400, "INVALID_REVISION");
  }

  const updated = await db.$client.query(
    "UPDATE public.auth_users SET name = $3, default_player_tag = $4, profile_revision = profile_revision + 1, updated_at = now() WHERE id = $1 AND profile_revision = $2 RETURNING id, name, default_player_tag, profile_revision, onboarding_completed_at, terms_version, privacy_notice_version, eligibility_policy_version",
    [userId, expectedRevision, nickname, defaultPlayerTag],
  );
  if (updated.rowCount) {
    const row = updated.rows[0];
    return readSafeAccount(row.id);
  }

  const current = await readSafeAccount(userId);
  throw new AccountError(409, "PROFILE_CHANGED", { current });
}

export async function deleteAccount(
  account: AuthenticatedAccount,
  confirmation: unknown,
  proof: {
    verificationId: string;
    identifier: string;
    userId: string;
    initiatingSessionId: string | null;
    sessionId: string;
    googleSubject: string;
    startedAt: string;
    verifiedAt: string;
  },
) {
  if (confirmation !== true) throw new AccountError(400, "DELETE_CONFIRMATION_REQUIRED");
  const backupPolicy = getAccountBackupRetentionPolicy();
  if (!backupPolicy) throw new AccountError(503, "POLICY_NOT_CONFIGURED");
  if (proof.userId !== account.userId || proof.sessionId !== account.sessionId ||
      (proof.initiatingSessionId !== null && proof.initiatingSessionId === proof.sessionId)) {
    throw new AccountError(403, "FRESH_GOOGLE_SIGN_IN_REQUIRED");
  }
  if (Date.now() - account.sessionCreatedAt.getTime() > 5 * 60 * 1_000) {
    throw new AccountError(403, "FRESH_GOOGLE_SIGN_IN_REQUIRED");
  }

  const client = await db.$client.connect();
  try {
    await client.query("BEGIN");
    const user = await client.query(
      "SELECT id FROM public.auth_users WHERE id = $1 FOR UPDATE",
      [account.userId],
    );
    if (!user.rowCount) throw new AccountError(404, "ACCOUNT_NOT_FOUND");

    const freshSession = await client.query(
      "SELECT id FROM public.auth_sessions WHERE id = $1 AND id = $2 AND user_id = $3 AND expires_at > now() AND created_at >= $4::timestamptz AND created_at >= now() - interval '5 minutes' FOR UPDATE",
      [account.sessionId, proof.sessionId, account.userId, proof.startedAt],
    );
    if (!freshSession.rowCount) throw new AccountError(403, "FRESH_GOOGLE_SIGN_IN_REQUIRED");

    const verifiedIntent = await client.query(
      "SELECT id FROM public.auth_verifications WHERE id = $1 AND identifier = $2 AND expires_at > now() AND value::jsonb->>'status' = 'verified' AND value::jsonb->>'userId' = $3 AND value::jsonb->>'initiatingSessionId' IS NOT DISTINCT FROM $4::text AND value::jsonb->>'verifiedSessionId' = $5 AND value::jsonb->>'googleSubject' = $6 AND value::jsonb->>'startedAt' = $7 AND value::jsonb->>'verifiedAt' = $8 AND (value::jsonb->>'verifiedAt')::timestamptz >= now() - interval '5 minutes' AND (value::jsonb->>'verifiedAt')::timestamptz <= now() FOR UPDATE",
      [proof.verificationId, proof.identifier, proof.userId, proof.initiatingSessionId,
        proof.sessionId, proof.googleSubject, proof.startedAt, proof.verifiedAt],
    );
    if (!verifiedIntent.rowCount) {
      throw new AccountError(403, "FRESH_GOOGLE_SIGN_IN_REQUIRED");
    }

    const googleIdentity = await client.query<{ account_id: string }>(
      "SELECT account_id FROM public.auth_accounts WHERE user_id = $1 AND provider_id = 'google'",
      [account.userId],
    );
    if (
      !googleIdentity.rowCount ||
      !googleIdentity.rows.some((row) =>
        row.account_id === proof.googleSubject && isDeletionGoogleSubjectAllowed(row.account_id),
      )
    ) {
      throw new AccountError(403, "FRESH_GOOGLE_SIGN_IN_REQUIRED");
    }

    await client.query(
      "DELETE FROM public.auth_verifications WHERE id = $1 AND identifier = $2",
      [proof.verificationId, proof.identifier],
    );

    await client.query(
      "INSERT INTO public.account_deletion_tombstones (user_id, expires_at) VALUES ($1, now() + ($2::int * interval '1 day')) ON CONFLICT (user_id) DO UPDATE SET deleted_at = now(), expires_at = EXCLUDED.expires_at",
      [account.userId, backupPolicy.deletionManifestRetentionDays],
    );
    await client.query(
      "INSERT INTO account_safety.deletion_ledger (user_id, expires_at, policy_version) VALUES ($1, now() + ($2::int * interval '1 day'), $3) ON CONFLICT (user_id) DO UPDATE SET deleted_at = now(), expires_at = EXCLUDED.expires_at, policy_version = EXCLUDED.policy_version",
      [account.userId, backupPolicy.deletionManifestRetentionDays, backupPolicy.version],
    );
    for (const scope of ACCOUNT_USER_RATE_LIMIT_SCOPES) {
      await client.query(
        "DELETE FROM public.account_rate_limits WHERE scope = $1 AND subject_hash = $2",
        [scope, hashAccountRateLimitSubject(scope, account.userId)],
      );
    }
    await client.query("DELETE FROM public.auth_users WHERE id = $1", [account.userId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export function isUUID(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}
