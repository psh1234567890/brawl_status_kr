import "server-only";

import { db } from "../db";

export async function cleanupExpiredAccountData() {
  const available = await db.$client.query<{
    account_tables_exist: boolean;
    safety_ledger_exists: boolean;
  }>(
    "SELECT to_regclass('public.auth_users') IS NOT NULL AS account_tables_exist, to_regclass('account_safety.deletion_ledger') IS NOT NULL AS safety_ledger_exists",
  );
  if (!available.rows[0]?.account_tables_exist) {
    return { cleaned: false, reason: "ACCOUNT_SCHEMA_NOT_INSTALLED" as const };
  }

  const safetyLedgerCte = available.rows[0]?.safety_ledger_exists
    ? "expired_safety_ledger AS (DELETE FROM account_safety.deletion_ledger WHERE expires_at <= now() RETURNING 1)"
    : "expired_safety_ledger AS (SELECT 1 WHERE false)";
  const result = await db.$client.query<{
    sessions: string;
    verifications: string;
    receipts: string;
    rate_limits: string;
    tombstones: string;
    safety_ledger: string;
  }>([
    "WITH expired_sessions AS (DELETE FROM public.auth_sessions WHERE expires_at <= now() RETURNING 1),",
    "expired_verifications AS (DELETE FROM public.auth_verifications WHERE expires_at <= now() RETURNING 1),",
    "expired_receipts AS (DELETE FROM public.account_sync_receipts WHERE expires_at <= now() RETURNING 1),",
    "expired_rate_limits AS (DELETE FROM public.account_rate_limits WHERE expires_at <= now() RETURNING 1),",
    "expired_tombstones AS (DELETE FROM public.account_deletion_tombstones WHERE expires_at <= now() RETURNING 1),",
    safetyLedgerCte,
    "SELECT (SELECT count(*) FROM expired_sessions) AS sessions,",
    "(SELECT count(*) FROM expired_verifications) AS verifications,",
    "(SELECT count(*) FROM expired_receipts) AS receipts,",
    "(SELECT count(*) FROM expired_rate_limits) AS rate_limits,",
    "(SELECT count(*) FROM expired_tombstones) AS tombstones,",
    "(SELECT count(*) FROM expired_safety_ledger) AS safety_ledger",
  ].join(" "));
  const row = result.rows[0];
  return {
    cleaned: true,
    counts: {
      sessions: Number(row.sessions),
      verifications: Number(row.verifications),
      receipts: Number(row.receipts),
      rateLimits: Number(row.rate_limits),
      tombstones: Number(row.tombstones),
      safetyLedger: Number(row.safety_ledger),
    },
  };
}
