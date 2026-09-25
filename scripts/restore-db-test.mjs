import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import pg from "pg";
import {
  applyDeletionManifest,
  verifyDeletionManifest,
} from "./account-deletion-manifest.mjs";

const { Client } = pg;
const backupArgIndex = process.argv.indexOf("--backup");
const backupPath = backupArgIndex >= 0 ? process.argv[backupArgIndex + 1] : undefined;
if (!backupPath) throw new Error("Usage: node scripts/restore-db-test.mjs --backup <absolute .dump path>");
const deletionManifestArgIndex = process.argv.indexOf("--deletion-manifest");
const explicitDeletionManifestPath = deletionManifestArgIndex >= 0
  ? process.argv[deletionManifestArgIndex + 1]
  : undefined;

const archivePath = path.resolve(backupPath);
if (!path.isAbsolute(archivePath) || !archivePath.endsWith(".dump")) {
  throw new Error("Restore test requires an absolute .dump archive path.");
}

const manifest = JSON.parse(await readFile(`${archivePath}.json`, "utf8"));
if (manifest.archive !== path.basename(archivePath)) throw new Error("Backup manifest does not match the archive name.");
const deletionManifestPath = explicitDeletionManifestPath
  ? path.resolve(explicitDeletionManifestPath)
  : manifest.deletionManifest?.file
    ? path.join(path.dirname(archivePath), manifest.deletionManifest.file)
    : null;
let deletionManifest = null;
if (deletionManifestPath) {
  deletionManifest = JSON.parse(await readFile(deletionManifestPath, "utf8"));
  verifyDeletionManifest(deletionManifest, process.env.ACCOUNT_DELETION_MANIFEST_SECRET);
}
if (manifest.account?.users > 0 && !deletionManifest) {
  throw new Error("Account-bearing backup restore requires a verified deletion manifest.");
}

const image = `postgres:${manifest.serverMajor}-alpine`;
const containerName = `brawl-restore-test-${Date.now()}`;
const backupDir = path.dirname(archivePath);
const archiveName = path.basename(archivePath);

runSafe("docker", ["info", "--format", "{{.ServerVersion}}"], "Docker engine");
let started = false;

try {
  runSafe(
    "docker",
    [
      "run", "--rm", "-d",
      "--name", containerName,
      "-e", "POSTGRES_HOST_AUTH_METHOD=trust",
      "-p", "127.0.0.1::5432",
      "-v", `${backupDir}:/backup:ro`,
      image,
    ],
    "restore test container start",
  );
  started = true;
  waitForPostgres(containerName);

  runSafe("docker", ["exec", containerName, "createdb", "-U", "postgres", "brawl_restore_test"], "test database creation");
  runSafe(
    "docker",
    ["exec", containerName, "psql", "-U", "postgres", "-d", "brawl_restore_test", "-v", "ON_ERROR_STOP=1", "-c", "DROP SCHEMA public;"],
    "empty test schema preparation",
  );
  runSafe(
    "docker",
    [
      "exec", containerName,
      "pg_restore",
      "-U", "postgres",
      "-d", "brawl_restore_test",
      "--no-owner",
      "--no-privileges",
      "--exit-on-error",
      "--single-transaction",
      `/backup/${archiveName}`,
    ],
    "pg_restore",
  );

  const hostPort = dockerHostPort(containerName);
  let deletionResult = null;
  if (deletionManifest) {
    const deletionClient = new Client({
      connectionString: `postgresql://postgres@127.0.0.1:${hostPort}/brawl_restore_test`,
    });
    await deletionClient.connect();
    try {
      const safetyMigrationSql = await readFile(
        new URL("../drizzle/0005_account_deletion_safety_ledger.sql", import.meta.url),
        "utf8",
      );
      await deletionClient.query(safetyMigrationSql);
      deletionResult = await applyDeletionManifest(
        deletionClient,
        deletionManifest,
        process.env.ACCOUNT_DELETION_MANIFEST_SECRET,
      );
      const activeIds = deletionManifest.entries
        .filter((entry) => Date.parse(entry.expiresAt) > Date.now())
        .map((entry) => entry.userId);
      if (activeIds.length) {
        const resurrected = await deletionClient.query(
          "SELECT count(*)::int AS total FROM public.auth_users WHERE id = ANY($1::uuid[])",
          [activeIds],
        );
        if (Number(resurrected.rows[0]?.total ?? 0) !== 0) {
          throw new Error("Restore verification failed: a deleted account was resurrected.");
        }
      }
    } finally {
      await deletionClient.end();
    }
  }
  const restored = await inspectRestore(hostPort);
  assertEqual("battle_logs row count", restored.battleLogs.total, manifest.battleLogs.total);
  assertEqual("missing fingerprint count", restored.battleLogs.missing_fingerprint, manifest.battleLogs.missing_fingerprint);
  assertEqual("missing timestamp count", restored.battleLogs.missing_timestamp, manifest.battleLogs.missing_timestamp);
  assertEqual("missing JSON count", restored.battleLogs.missing_json, manifest.battleLogs.missing_json);

  const missingIndexes = manifest.requiredIndexes.filter((name) => !restored.indexes.includes(name));
  if (missingIndexes.length) throw new Error(`Restore verification failed: missing indexes: ${missingIndexes.join(", ")}`);
  assertEqual("RLS enabled", restored.rls?.relrowsecurity, manifest.rls?.relrowsecurity);
  assertEqual("FORCE RLS", restored.rls?.relforcerowsecurity, manifest.rls?.relforcerowsecurity);

  console.log("Restore verification passed.");
  console.log(`Restored rows: ${restored.battleLogs.total}`);
  console.log(`Indexes verified: ${manifest.requiredIndexes.length}`);
  console.log(`RLS enabled: ${Boolean(restored.rls?.relrowsecurity)}`);
  console.log(`FORCE RLS: ${Boolean(restored.rls?.relforcerowsecurity)}`);
  if (deletionResult) {
    console.log(`Deletion manifest active entries: ${deletionResult.activeEntries}`);
    console.log(`Restored account rows removed: ${deletionResult.deletedUsers}`);
  }
} finally {
  if (started) spawnSync("docker", ["rm", "-f", containerName], { encoding: "utf8", windowsHide: true });
}

async function inspectRestore(port) {
  const client = new Client({ connectionString: `postgresql://postgres@127.0.0.1:${port}/brawl_restore_test` });
  await client.connect();
  try {
    const { rows: battleRows } = await client.query(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE battle_fingerprint IS NULL)::int AS missing_fingerprint,
        count(*) FILTER (WHERE battle_timestamp IS NULL)::int AS missing_timestamp,
        count(*) FILTER (WHERE battle_detail_json IS NULL)::int AS missing_json
      FROM battle_logs
    `);
    const { rows: indexRows } = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'battle_logs'
      ORDER BY indexname
    `);
    const { rows: rlsRows } = await client.query(`
      SELECT relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE oid = 'public.battle_logs'::regclass
    `);
    return {
      battleLogs: battleRows[0],
      indexes: indexRows.map((row) => row.indexname),
      rls: rlsRows[0] ?? null,
    };
  } finally {
    await client.end();
  }
}

function waitForPostgres(containerName) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = spawnSync("docker", ["exec", containerName, "pg_isready", "-U", "postgres"], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.status === 0) return;
    spawnSync("powershell.exe", ["-NoProfile", "-Command", "Start-Sleep -Milliseconds 500"], { windowsHide: true });
  }
  throw new Error("Restore test PostgreSQL container did not become ready.");
}

function dockerHostPort(containerName) {
  const output = runSafe("docker", ["port", containerName, "5432/tcp"], "Docker port lookup");
  const match = output.match(/:(\d+)\s*$/m);
  if (!match) throw new Error("Unable to determine restore test port.");
  return Number(match[1]);
}

function runSafe(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
  return result.stdout.trim();
}

function assertEqual(label, actual, expected) {
  if (String(actual) !== String(expected)) {
    throw new Error(`Restore verification failed for ${label}: expected ${expected}, got ${actual}.`);
  }
}
