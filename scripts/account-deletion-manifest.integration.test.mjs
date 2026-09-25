import { randomUUID } from "node:crypto";
import pg from "pg";
import { describe, expect, it } from "vitest";
import {
  applyDeletionManifest,
  buildDeletionManifest,
  readActiveDeletionRows,
} from "./account-deletion-manifest.mjs";

const databaseUrl = process.env.ACCOUNT_MANIFEST_TEST_DATABASE_URL;
const test = databaseUrl ? it : it.skip;
const secret = "integration-only-deletion-manifest-secret-123456";
const policy = {
  version: "integration-v1",
  backupRetentionDays: 30,
  deletionManifestRetentionDays: 35,
};

describe("account deletion manifest PostgreSQL integration", () => {
  test("removes an account resurrected by an older restore and restores both deletion ledgers", async () => {
    const { Pool } = pg;
    const pool = new Pool({ connectionString: databaseUrl, max: 1 });
    const userId = randomUUID();
    try {
      await pool.query(
        "INSERT INTO public.auth_users (id, name, email, email_verified) VALUES ($1, $2, $3, true)",
        [userId, "Manifest integration", "manifest-" + userId + "@example.invalid"],
      );
      await pool.query(
        "INSERT INTO public.account_deletion_tombstones (user_id, deleted_at, expires_at) VALUES ($1, now() - interval '1 hour', now() + interval '35 days')",
        [userId],
      );
      await pool.query(
        "INSERT INTO account_safety.deletion_ledger (user_id, deleted_at, expires_at, policy_version) VALUES ($1, now() - interval '1 hour', now() + interval '35 days', $2)",
        [userId, policy.version],
      );
      await pool.query("DELETE FROM public.auth_users WHERE id = $1", [userId]);

      const rows = await readActiveDeletionRows(pool);
      const manifest = buildDeletionManifest({ rows, policy, secret });
      expect(manifest.entries.some((entry) => entry.userId === userId)).toBe(true);

      await pool.query("DELETE FROM public.account_deletion_tombstones WHERE user_id = $1", [userId]);
      await pool.query(
        "INSERT INTO public.auth_users (id, name, email, email_verified) VALUES ($1, $2, $3, true)",
        [userId, "Restored account", "restored-" + userId + "@example.invalid"],
      );

      const applied = await applyDeletionManifest(pool, manifest, secret);
      expect(applied.deletedUsers).toBeGreaterThanOrEqual(1);
      const result = await pool.query(
        "SELECT (SELECT count(*) FROM public.auth_users WHERE id = $1)::int AS users, (SELECT count(*) FROM public.account_deletion_tombstones WHERE user_id = $1)::int AS tombstones, (SELECT count(*) FROM account_safety.deletion_ledger WHERE user_id = $1)::int AS safety",
        [userId],
      );
      expect(result.rows[0]).toEqual({ users: 0, tombstones: 1, safety: 1 });
    } finally {
      await pool.query("DELETE FROM account_safety.deletion_ledger WHERE user_id = $1", [userId]).catch(() => undefined);
      await pool.query("DELETE FROM public.account_deletion_tombstones WHERE user_id = $1", [userId]).catch(() => undefined);
      await pool.query("DELETE FROM public.auth_users WHERE id = $1", [userId]).catch(() => undefined);
      await pool.end();
    }
  });
});
