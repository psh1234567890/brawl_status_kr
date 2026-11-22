import { db } from "../db";
import { deleteCommunityImageObject } from "./communityImageStore";

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

export async function cleanupCommunityImages(deadline?: AbortSignal) {
  deadline?.throwIfAborted();
  const expired = await db.$client.query(
    "DELETE FROM public.community_images WHERE post_id IS NULL AND comment_id IS NULL AND created_at <= now() - interval '24 hours'",
  );
  // Wait past the bounded upload timeout before deleting. This covers an
  // account being deleted while its upload is still in flight.
  deadline?.throwIfAborted();
  const queued = await db.$client.query<{ object_path: string }>(
    "SELECT o.object_path FROM public.community_image_objects o WHERE o.created_at < now() - interval '5 minutes' AND NOT EXISTS (SELECT 1 FROM public.community_images i WHERE i.object_path = o.object_path) ORDER BY o.created_at LIMIT 100",
  );
  let deleted = 0;
  for (const row of queued.rows) {
    if (deadline?.aborted) break;
    try {
      await deleteCommunityImageObject(row.object_path, deadline);
      deadline?.throwIfAborted();
      await db.$client.query("DELETE FROM public.community_image_objects WHERE object_path = $1", [row.object_path]);
      deleted++;
    } catch {
      // Keep the inventory entry for the next maintenance run.
    }
  }
  return { expired: expired.rowCount ?? 0, deleted, retry: queued.rows.length - deleted };
}

export async function runAccountMaintenance(deadline?: AbortSignal) {
  const accounts = await cleanupExpiredAccountData();
  const images = await cleanupCommunityImages(deadline);
  return { ...accounts, images };
}
