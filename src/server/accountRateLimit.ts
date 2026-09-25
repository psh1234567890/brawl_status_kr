import "server-only";

import { createHmac } from "node:crypto";
import { db } from "../db";

export type AccountRateLimitRule = {
  scope: string;
  subject: string;
  windowSeconds: number;
  maxRequests: number;
};

export type AccountRateLimitDecision = {
  allowed: boolean;
  retryAfter: number;
};

function getRateLimitSecret() {
  const secret = process.env.ACCOUNT_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ACCOUNT_RATE_LIMIT_SECRET is not configured.");
  }
  return secret;
}

export function hashAccountRateLimitSubject(scope: string, subject: string) {
  return createHmac("sha256", getRateLimitSecret())
    .update(scope)
    .update("\0")
    .update(subject)
    .digest("hex");
}

export const ACCOUNT_USER_RATE_LIMIT_SCOPES = [
  "account-get-user",
  "account-delete-user",
  "profile-user",
  "onboarding-user",
  "minigame-read-user",
  "minigame-write-user-minute",
  "minigame-write-user-hour",
] as const;

export async function consumeAccountRateLimits(
  rules: readonly AccountRateLimitRule[],
): Promise<AccountRateLimitDecision> {
  if (rules.length === 0) return { allowed: true, retryAfter: 0 };

  const client = await db.$client.connect();
  let allowed = true;
  let retryAfter = 0;

  try {
    await client.query("BEGIN");
    for (const rule of rules) {
      if (
        !/^[a-z0-9:_-]{1,64}$/i.test(rule.scope) ||
        !Number.isSafeInteger(rule.windowSeconds) ||
        rule.windowSeconds < 1 ||
        !Number.isSafeInteger(rule.maxRequests) ||
        rule.maxRequests < 1
      ) {
        throw new Error("Invalid account rate limit rule.");
      }

      const windowMs = rule.windowSeconds * 1_000;
      const now = Date.now();
      const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
      const expiresAt = new Date(windowStart.getTime() + windowMs + 60 * 60 * 1_000);
      const result = await client.query<{ request_count: number }>(
        "INSERT INTO public.account_rate_limits (scope, subject_hash, window_start, request_count, expires_at) VALUES ($1, $2, $3, 1, $4) ON CONFLICT (scope, subject_hash, window_start) DO UPDATE SET request_count = public.account_rate_limits.request_count + 1, expires_at = GREATEST(public.account_rate_limits.expires_at, EXCLUDED.expires_at) RETURNING request_count",
        [rule.scope, hashAccountRateLimitSubject(rule.scope, rule.subject), windowStart, expiresAt],
      );
      const count = Number(result.rows[0]?.request_count);
      if (count > rule.maxRequests) {
        allowed = false;
        retryAfter = Math.max(
          retryAfter,
          Math.ceil((windowStart.getTime() + windowMs - now) / 1_000),
        );
      }
    }
    await client.query("COMMIT");
    return { allowed, retryAfter: Math.max(1, retryAfter) };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function consumeBetterAuthRateLimit(
  key: string,
  rule: { window: number; max: number },
) {
  const decision = await consumeAccountRateLimits([
    {
      scope: "better-auth",
      subject: key,
      windowSeconds: rule.window,
      maxRequests: rule.max,
    },
  ]);
  return {
    allowed: decision.allowed,
    retryAfter: decision.allowed ? null : decision.retryAfter,
  };
}

export function getAccountRateLimitResponse(retryAfter: number) {
  return Response.json(
    { error: "RATE_LIMITED" },
    {
      status: 429,
      headers: {
        "Cache-Control": "private, no-store",
        "Retry-After": String(Math.max(1, retryAfter)),
      },
    },
  );
}
