import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import pg from "pg";
import {
  buildDeletionManifest,
  readActiveDeletionRows,
} from "./account-deletion-manifest.mjs";

dotenv.config({ path: ".env.local", quiet: true });
const { Client } = pg;
const repoRoot = path.resolve(process.cwd());
const outputArgIndex = process.argv.indexOf("--output-dir");
const defaultRoot = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
const outputDir = path.resolve(
  outputArgIndex >= 0 && process.argv[outputArgIndex + 1]
    ? process.argv[outputArgIndex + 1]
    : path.join(defaultRoot, "BrawlStatusKR", "backups"),
);
if (isInside(repoRoot, outputDir)) {
  throw new Error("Deletion manifest output must be outside the repository.");
}

const connectionString = process.env.ACCOUNT_DELETION_EXPORT_DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "ACCOUNT_DELETION_EXPORT_DATABASE_URL is required. DATABASE_URL and DIRECT_URL are never used by this helper.",
  );
}
const policy = readPolicy();
const secret = process.env.ACCOUNT_DELETION_MANIFEST_SECRET;

await mkdir(outputDir, { recursive: true, mode: 0o700 });
restrictWindowsPath(outputDir, true);
const client = new Client({ connectionString });
await client.connect();
try {
  await client.query("SET default_transaction_read_only = on");
  const rows = await readActiveDeletionRows(client);
  const manifest = buildDeletionManifest({ rows, policy, secret });
  const timestamp = manifest.exportedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const timestampedPath = path.join(outputDir, "account-deletions-" + timestamp + ".json");
  const latestPath = path.join(outputDir, "account-deletions-latest.json");
  const body = JSON.stringify(manifest, null, 2) + "\n";
  const partial = latestPath + ".partial";
  await writeFile(timestampedPath, body, { mode: 0o600 });
  await writeFile(partial, body, { mode: 0o600 });
  await rename(partial, latestPath);
  restrictWindowsPath(timestampedPath, false);
  restrictWindowsPath(latestPath, false);
  console.log("Deletion manifest exported: " + timestampedPath);
  console.log("Latest manifest updated: " + latestPath);
  console.log("Entries: " + manifest.entries.length);
  console.log("SHA256: " + createHash("sha256").update(body).digest("hex"));
} finally {
  await client.end();
}

function readPolicy() {
  const version = process.env.ACCOUNT_BACKUP_RETENTION_POLICY_VERSION?.trim();
  const backupRetentionDays = Number(process.env.ACCOUNT_BACKUP_RETENTION_DAYS);
  const deletionManifestRetentionDays = Number(process.env.ACCOUNT_DELETION_MANIFEST_RETENTION_DAYS);
  if (
    !version || !/^[a-zA-Z0-9._-]{1,64}$/.test(version) ||
    !Number.isSafeInteger(backupRetentionDays) || backupRetentionDays < 1 ||
    !Number.isSafeInteger(deletionManifestRetentionDays) ||
    deletionManifestRetentionDays <= backupRetentionDays
  ) {
    throw new Error("Backup/deletion-manifest retention policy is not configured.");
  }
  if ((process.env.ACCOUNT_DELETION_MANIFEST_SECRET?.length ?? 0) < 32) {
    throw new Error("ACCOUNT_DELETION_MANIFEST_SECRET must be at least 32 characters.");
  }
  return { version, backupRetentionDays, deletionManifestRetentionDays };
}

function restrictWindowsPath(target, directory) {
  if (process.platform !== "win32") return;
  const user = process.env.USERDOMAIN && process.env.USERNAME
    ? process.env.USERDOMAIN + "\\" + process.env.USERNAME
    : process.env.USERNAME;
  if (!user) throw new Error("Unable to determine the current Windows user for ACL restriction.");
  const grant = directory ? user + ":(OI)(CI)F" : user + ":F";
  const result = spawnSync("icacls", [target, "/inheritance:r", "/grant:r", grant], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error("Failed to restrict deletion manifest permissions.");
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
