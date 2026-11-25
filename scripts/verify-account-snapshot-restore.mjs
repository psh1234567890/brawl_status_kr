import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, open, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";
import { decryptAccountArtifact } from "./account-artifact.mjs";
import { applyDeletionManifest, verifyDeletionManifest } from "./account-deletion-manifest.mjs";

const database = "brawloop_snapshot_restore_test";
const childEnv = Object.fromEntries(
  ["PATH", "HOME", "SystemRoot", "WINDIR", "TMP", "TEMP", "USERPROFILE", "LOCALAPPDATA"]
    .filter((key) => process.env[key])
    .map((key) => [key, process.env[key]]),
);

function run(command, args, stage, { env = childEnv, input = "ignore" } = {}) {
  const result = spawnSync(command, args, { env, stdio: [input, "pipe", "pipe"], encoding: "utf8", timeout: 120_000, windowsHide: true });
  // Raw command errors can include private restored data.
  if (result.status !== 0) throw new Error(stage);
  return result.stdout.trim();
}

async function verifyRestore() {
  const { ACCOUNT_SNAPSHOT_TARGET: target, ACCOUNT_SNAPSHOT_PROJECT_REF: projectRef,
    ACCOUNT_SNAPSHOT_OUTPUT_DIR: sources, ACCOUNT_RESTORE_POSTGRES_MAJOR: major,
    ACCOUNT_BACKUP_ENCRYPTION_KEY: encryptionKey, ACCOUNT_DELETION_MANIFEST_SECRET: manifestSecret } = process.env;
  if (!sources || !path.isAbsolute(sources) || !/^(1[4-9]|2[0-9]|30)$/.test(major ?? "") ||
      !["test", "staging", "production"].includes(target)) throw new Error("restore configuration");
  const files = (await readdir(sources, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name);
  const archives = files.filter((name) => /^accounts-\d{8}T\d{6}Z-[0-9a-f-]{36}\.dump\.enc$/.test(name));
  if (archives.length !== 1) throw new Error("snapshot selection");
  const manifestFile = archives[0].replace(/^accounts-/, "account-deletions-").replace(/\.dump\.enc$/, ".json.enc");
  if (!files.includes(manifestFile)) throw new Error("snapshot pairing");

  const temporary = await mkdtemp(path.join(os.tmpdir(), "brawloop-snapshot-restore-"));
  const container = "brawloop-snapshot-restore-" + randomUUID();
  const password = randomBytes(24).toString("hex");
  const context = { target, projectRef };
  let client;
  let started = false;
  let stage = "snapshot restore";
  try {
    stage = "artifact authentication";
    const archive = path.join(temporary, "accounts.dump");
    const manifestPath = path.join(temporary, "deletions.json");
    await decryptAccountArtifact(path.join(sources, archives[0]), archive, encryptionKey, { ...context, kind: "backup" });
    await decryptAccountArtifact(path.join(sources, manifestFile), manifestPath, encryptionKey, { ...context, kind: "manifest" });
    const manifest = verifyDeletionManifest(JSON.parse(await readFile(manifestPath, "utf8")), manifestSecret);
    if (Math.abs(Date.now() - Date.parse(manifest.exportedAt)) > 30 * 60_000) throw new Error("deletion manifest freshness");
    await rm(manifestPath);

    stage = "isolated database startup";
    const dataRoot = Number(major) >= 18 ? "/var/lib/postgresql" : "/var/lib/postgresql/data";
    run("docker", ["run", "--rm", "--detach", "--name", container, "--publish", "127.0.0.1::5432",
      "--tmpfs", dataRoot, "--env", "POSTGRES_PASSWORD", "--env", "POSTGRES_DB=" + database, "postgres:" + major + "-alpine"],
    stage, { env: { ...childEnv, POSTGRES_PASSWORD: password } });
    started = true;
    const port = run("docker", ["port", container, "5432/tcp"], stage).match(/^127\.0\.0\.1:(\d+)$/)?.[1];
    if (!port) throw new Error("isolated port binding");
    const connection = "postgresql://postgres:" + password + "@127.0.0.1:" + port + "/" + database;
    for (let attempt = 0; attempt < 40; attempt++) {
      const ready = spawnSync("docker", ["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "postgres", "-d", database],
        { env: childEnv, stdio: "ignore", timeout: 4_000, windowsHide: true });
      if (ready.status === 0) break;
      if (attempt === 39) throw new Error("isolated database readiness");
      await delay(500);
    }

    stage = "isolated archive import";
    const dump = await open(archive, "r");
    try {
      run("docker", ["exec", "--interactive", "--user", "postgres", container, "pg_restore",
        "--dbname=" + database, "--no-owner", "--no-privileges", "--exit-on-error", "--single-transaction"], stage, { input: dump.fd });
    } finally {
      await dump.close();
    }
    await rm(archive);

    stage = "account and deletion verification";
    run(process.execPath, ["scripts/migrate-accounts.mjs"], stage, { env: { ...childEnv, ACCOUNT_MIGRATION_DATABASE_URL: connection } });
    client = new pg.Client({ connectionString: connection, connectionTimeoutMillis: 5_000, query_timeout: 15_000 });
    await client.connect();
    await applyDeletionManifest(client, manifest, manifestSecret, new Date(), { revokeRestoredAuthentication: true });
    const { rows: [result] } = await client.query(`
      SELECT NOT EXISTS (SELECT FROM auth_sessions) AS no_sessions,
        NOT EXISTS (SELECT FROM auth_verifications) AS no_verifications,
        NOT EXISTS (SELECT FROM account_safety.deletion_ledger d JOIN auth_users u ON u.id = d.user_id
          WHERE d.expires_at > now()) AS no_deleted_accounts`);
    if (!result?.no_sessions || !result.no_verifications || !result.no_deleted_accounts) throw new Error(stage);
  } catch {
    throw new Error(stage);
  } finally {
    await client?.end().catch(() => undefined);
    try {
      if (started) run("docker", ["rm", "--force", container], "isolated database cleanup");
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }
}

try {
  await verifyRestore();
  console.log("Account backup restored in disposable PostgreSQL. Deletion records reapplied; restored authentication and deleted accounts are absent.");
} catch (error) {
  const safeStages = ["restore configuration", "snapshot selection", "snapshot pairing", "artifact authentication",
    "isolated database startup", "isolated archive import", "account and deletion verification", "isolated database cleanup"];
  console.error("Account backup restore verification failed: " + (safeStages.includes(error?.message) ? error.message : "private diagnostics suppressed"));
  process.exitCode = 1;
}
