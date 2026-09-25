import { createHash, randomBytes, randomUUID } from "node:crypto";
import { makeSignature } from "better-auth/crypto";
import { Pool } from "pg";
import { test as base, type BrowserContext } from "@playwright/test";

export type SyntheticAccount = {
  userId: string;
  email: string;
  sessionToken: string;
  sessionId: string;
  googleSubject: string;
};

export const test = base.extend<{ syntheticAccount: SyntheticAccount }>({
  syntheticAccount: async ({ context, baseURL }, runFixture) => {
    const databaseUrl = process.env.DATABASE_URL;
    const authSecret = process.env.BETTER_AUTH_SECRET;
    if (!databaseUrl || !authSecret || !baseURL) {
      throw new Error("Account E2E requires the disposable test database and test auth configuration.");
    }

    const pool = new Pool({ connectionString: databaseUrl, max: 1 });
    const userId = randomUUID();
    const googleSubject = "ci-google-sub-" + randomUUID();
    const email = "synthetic-" + userId + "@example.invalid";
    const sessionToken = randomBytes(32).toString("base64url");
    const sessionId = randomUUID();
    const termsVersion = process.env.ACCOUNT_TERMS_VERSION ?? "ci-terms-v1";
    const privacyVersion = process.env.ACCOUNT_PRIVACY_NOTICE_VERSION ?? "ci-privacy-v1";
    const eligibilityVersion = process.env.ACCOUNT_ELIGIBILITY_POLICY_VERSION ?? "ci-eligibility-v1";

    try {
      await pool.query(
        "INSERT INTO public.auth_users (id, name, email, email_verified, terms_version, privacy_notice_version, eligibility_policy_version, onboarding_completed_at) VALUES ($1, $2, $3, true, $4, $5, $6, now())",
        [userId, "CI-" + userId.slice(0, 8), email, termsVersion, privacyVersion, eligibilityVersion],
      );
      await pool.query(
        "INSERT INTO public.auth_accounts (id, user_id, provider_id, account_id) VALUES ($1, $2, 'google', $3)",
        [randomUUID(), userId, googleSubject],
      );
      await pool.query(
        "INSERT INTO public.auth_sessions (id, user_id, token, expires_at) VALUES ($1, $2, $3, now() + interval '30 days')",
        [sessionId, userId, sessionToken],
      );

      const signedCookie = sessionToken + "." + await makeSignature(sessionToken, authSecret);
      await context.addCookies([{
        name: "better-auth.session_token",
        value: signedCookie,
        url: baseURL,
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      }]);

      await runFixture({ userId, email, sessionToken, sessionId, googleSubject });
    } finally {
      await pool.query("DELETE FROM account_safety.deletion_ledger WHERE user_id = $1", [userId]).catch(() => undefined);
      await pool.query("DELETE FROM public.account_deletion_tombstones WHERE user_id = $1", [userId]).catch(() => undefined);
      await pool.query("DELETE FROM public.auth_users WHERE id = $1", [userId]).catch(() => undefined);
      await pool.end();
    }
  },
});

/** Test-only provider callback simulation. Never imported by application code. */
export async function seedVerifiedDeletionSession(
  context: BrowserContext,
  account: SyntheticAccount,
  origin: string,
) {
  const authSecret = process.env.BETTER_AUTH_SECRET;
  const rateLimitSecret = process.env.ACCOUNT_RATE_LIMIT_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!authSecret || !rateLimitSecret || !baseURL) {
    throw new Error("Deletion E2E requires synthetic test configuration.");
  }

  const startedAt = new Date(Date.now() - 1_000);
  const created = await context.request.post("/api/account/deletion/reauth", {
    headers: { Origin: origin },
    data: { expectedUserId: account.userId, callbackURL: "/account" },
  });
  if (!created.ok()) throw new Error("Could not start the synthetic deletion reauthentication fixture.");

  const ticketCookie = (await context.cookies()).find((cookie) =>
    cookie.name === "brawl-account-deletion",
  );
  if (!ticketCookie) throw new Error("The deletion reauthentication cookie was not set.");
  const identifier = "account-deletion:" + createHash("sha256")
    .update(ticketCookie.value)
    .digest("hex");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const verifiedSessionId = randomUUID();
  const verifiedSessionToken = randomBytes(32).toString("base64url");
  const verifiedAt = new Date().toISOString();
  try {
    const intentRow = await pool.query<{ id: string; value: string }>(
      "SELECT id, value FROM public.auth_verifications WHERE identifier = $1 AND expires_at > now()",
      [identifier],
    );
    if (!intentRow.rowCount) throw new Error("The deletion intent fixture was not stored.");
    const pending = JSON.parse(intentRow.rows[0].value) as Record<string, unknown>;
    const verified = {
      ...pending,
      status: "verified",
      stateHash: createHash("sha256").update("synthetic-provider-state").digest("hex"),
      startedAt: startedAt.toISOString(),
      verifiedSessionId,
      verifiedAt,
    };
    await pool.query(
      "INSERT INTO public.auth_sessions (id, user_id, token, created_at, updated_at, expires_at) VALUES ($1, $2, $3, $4::timestamptz, $4::timestamptz, $4::timestamptz + interval '30 days')",
      [verifiedSessionId, account.userId, verifiedSessionToken, startedAt],
    );
    await pool.query(
      "UPDATE public.auth_verifications SET value = $2, updated_at = now() WHERE id = $1",
      [intentRow.rows[0].id, JSON.stringify(verified)],
    );
  } finally {
    await pool.end();
  }

  const cookieName = baseURL.startsWith("https://")
    ? "__Secure-better-auth.session_token"
    : "better-auth.session_token";
  const cookieValue = verifiedSessionToken + "." + await makeSignature(verifiedSessionToken, authSecret);
  await context.addCookies([{
    name: cookieName,
    value: cookieValue,
    url: origin,
    httpOnly: true,
    secure: baseURL.startsWith("https://"),
    sameSite: "Lax",
  }]);
}

export { expect } from "@playwright/test";
