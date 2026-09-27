import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { describe, expect, it } from "vitest";
import { decryptAccountArtifact } from "./account-artifact.mjs";
import { ACCOUNT_SNAPSHOT_TABLES } from "./account-snapshot-config.mjs";
import { applyDeletionManifest, verifyDeletionManifest } from "./account-deletion-manifest.mjs";

const configuredUrl = process.env.ACCOUNT_SNAPSHOT_TEST_DATABASE_URL;
const test = configuredUrl ? it : it.skip;

function run(command, args, env) {
  const result = spawnSync(command, args, { env, encoding: "utf8", windowsHide: true, timeout: 90_000 });
  if (result.status !== 0) throw new Error("Isolated account snapshot tool failed (private process output suppressed).");
}

describe("account-only encrypted backup PostgreSQL integration", () => {
  test("excludes unrelated tables and removes later deletions and restored authentication", async () => {
    const base = new URL(configuredUrl);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname) || !base.pathname.endsWith("_test")) {
      throw new Error("Snapshot integration requires an explicitly isolated loopback test database.");
    }
    const suffix = randomUUID().replace(/-/g, "");
    const sourceName = "snapshot_" + suffix + "_source_test";
    const restoreName = "snapshot_" + suffix + "_restore_test";
    const temporary = await mkdtemp(path.join(os.tmpdir(), "brawl-snapshot-integration-"));
    const admin = new pg.Client({ connectionString: base.toString() });
    const databases = [];
    let source;
    let restore;
    const secret = "snapshot-integration-only-manifest-secret";
    const encryptionKey = "33".repeat(32);
    const context = { target: "test", projectRef: "isolated-test" };
    const sourceUrl = new URL(base);
    sourceUrl.pathname = "/" + sourceName;
    const restoreUrl = new URL(base);
    restoreUrl.pathname = "/" + restoreName;
    const env = {
      ...process.env,
      ACCOUNT_MIGRATION_DATABASE_URL: sourceUrl.toString(),
      ACCOUNT_SNAPSHOT_ENABLED: "1", ACCOUNT_SNAPSHOT_TARGET: "test", ACCOUNT_SNAPSHOT_PROJECT_REF: "isolated-test",
      ACCOUNT_SNAPSHOT_DATABASE_URL: sourceUrl.toString(), ACCOUNT_SNAPSHOT_OUTPUT_DIR: temporary,
      ACCOUNT_BACKUP_RETENTION_POLICY_VERSION: "snapshot-integration-v1",
      ACCOUNT_BACKUP_RETENTION_DAYS: "7", ACCOUNT_DELETION_MANIFEST_RETENTION_DAYS: "14",
      ACCOUNT_DELETION_MANIFEST_SECRET: secret, ACCOUNT_BACKUP_ENCRYPTION_KEY: encryptionKey,
      ACCOUNT_PG_TOOLS_DOCKER: "0",
    };
    try {
      await admin.connect();
      for (const name of [sourceName, restoreName]) {
        await admin.query('CREATE DATABASE "' + name + '"');
        databases.push(name);
      }
      run(process.execPath, ["scripts/migrate-accounts.mjs"], env);
      source = new pg.Client({ connectionString: sourceUrl.toString() });
      await source.connect();
      // Synthetic sentinels exist only in this newly created disposable DB.
      await source.query("CREATE TABLE public.students (marker text); CREATE TABLE public.battle_logs (marker text)");
      await source.query("INSERT INTO public.students VALUES ('synthetic-only'); INSERT INTO public.battle_logs VALUES ('synthetic-only')");
      const deletedId = randomUUID();
      const survivorId = randomUUID();
      for (const id of [deletedId, survivorId]) {
        await source.query("INSERT INTO public.auth_users (id, name, email) VALUES ($1, 'Synthetic backup account', $2)", [id, id + "@example.invalid"]);
      }
      await source.query("INSERT INTO public.auth_sessions (user_id, token, expires_at) VALUES ($1, $2, now() + interval '1 day')", [survivorId, randomUUID()]);
      await source.query("INSERT INTO public.auth_verifications (identifier, value, expires_at) VALUES ('synthetic-consumed-state', 'synthetic-only', now() + interval '1 hour')");
      run(process.execPath, ["scripts/snapshot-accounts.mjs", "backup"], env);
      const initialFiles = await readdir(temporary);
      const backup = initialFiles.find((name) => name.endsWith(".dump.enc"));
      expect(backup).toBeTruthy();
      await source.query("DELETE FROM public.auth_users WHERE id = $1", [deletedId]);
      await source.query("INSERT INTO public.account_deletion_tombstones (user_id, expires_at) VALUES ($1, now() + interval '14 days')", [deletedId]);
      await source.query("INSERT INTO account_safety.deletion_ledger (user_id, expires_at, policy_version) VALUES ($1, now() + interval '14 days', 'snapshot-integration-v1')", [deletedId]);
      run(process.execPath, ["scripts/snapshot-accounts.mjs", "manifest"], env);
      const newestManifest = (await readdir(temporary)).find((name) => name.endsWith(".json.enc") && !initialFiles.includes(name));
      expect(newestManifest).toBeTruthy();
      const dumpPath = path.join(temporary, "restore.dump");
      const manifestPath = path.join(temporary, "restore-deletions.json");
      await decryptAccountArtifact(path.join(temporary, backup), dumpPath, encryptionKey, { ...context, kind: "backup" });
      await decryptAccountArtifact(path.join(temporary, newestManifest), manifestPath, encryptionKey, { ...context, kind: "manifest" });
      const manifest = verifyDeletionManifest(JSON.parse(await readFile(manifestPath, "utf8")), secret);
      const passFile = path.join(temporary, "restore-pgpass");
      const escape = (value) => value.replace(/\\/g, "\\\\").replace(/:/g, "\\:");
      await writeFile(passFile, [base.hostname, base.port || "5432", restoreName, decodeURIComponent(base.username), decodeURIComponent(base.password)].map(escape).join(":") + "\n", { mode: 0o600 });
      run(process.env.ACCOUNT_PG_RESTORE_BINARY || "pg_restore", ["--no-owner", "--no-privileges", "--exit-on-error", "--single-transaction", "--no-password", dumpPath], {
        ...process.env, PGHOST: base.hostname, PGPORT: base.port || "5432", PGDATABASE: restoreName,
        PGUSER: decodeURIComponent(base.username), PGPASSFILE: passFile, PGSSLMODE: "disable",
      });
      restore = new pg.Client({ connectionString: restoreUrl.toString() });
      await restore.connect();
      const tables = await restore.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
      expect(tables.rows.map((row) => row.tablename)).toEqual([...ACCOUNT_SNAPSHOT_TABLES].sort());
      expect((await restore.query("SELECT count(*)::int AS count FROM public.auth_users")).rows[0].count).toBe(2);
      run(process.execPath, ["scripts/migrate-accounts.mjs"], { ...env, ACCOUNT_MIGRATION_DATABASE_URL: restoreUrl.toString() });
      const result = await applyDeletionManifest(restore, manifest, secret, new Date(), { revokeRestoredAuthentication: true });
      expect(result).toMatchObject({ deletedUsers: 1, revokedSessions: 1, removedVerifications: 1 });
      expect((await restore.query("SELECT id FROM public.auth_users")).rows).toEqual([{ id: survivorId }]);
      expect((await restore.query("SELECT count(*)::int AS count FROM account_safety.deletion_ledger")).rows[0].count).toBe(1);
      expect((await restore.query("SELECT count(*)::int AS count FROM public.auth_sessions")).rows[0].count).toBe(0);
    } finally {
      await source?.end().catch(() => undefined);
      await restore?.end().catch(() => undefined);
      for (const name of databases) {
        if (!/^snapshot_[a-f0-9]{32}_(source|restore)_test$/.test(name)) throw new Error("Invalid disposable database cleanup target.");
        await admin.query('DROP DATABASE "' + name + '" WITH (FORCE)').catch(() => undefined);
      }
      await admin.end().catch(() => undefined);
      if (path.dirname(temporary) !== path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith("brawl-snapshot-integration-")) throw new Error("Invalid integration cleanup path.");
      await rm(temporary, { recursive: true, force: true });
    }
  }, 120_000);
});
