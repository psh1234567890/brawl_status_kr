import { readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

const repoRoot = path.resolve(process.cwd());
const outputArgIndex = process.argv.indexOf("--output-dir");
const defaultRoot = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
const backupDir = path.resolve(
  outputArgIndex >= 0 && process.argv[outputArgIndex + 1]
    ? process.argv[outputArgIndex + 1]
    : path.join(defaultRoot, "BrawlStatusKR", "backups"),
);
if (isInside(repoRoot, backupDir)) {
  throw new Error("Backup prune target must be outside the repository.");
}

const backupRetentionDays = parseDays(
  process.env.ACCOUNT_BACKUP_RETENTION_DAYS,
  "ACCOUNT_BACKUP_RETENTION_DAYS",
);
const deletionManifestRetentionDays = parseDays(
  process.env.ACCOUNT_DELETION_MANIFEST_RETENTION_DAYS,
  "ACCOUNT_DELETION_MANIFEST_RETENTION_DAYS",
);
if (deletionManifestRetentionDays <= backupRetentionDays) {
  throw new Error("Deletion manifest retention must be longer than backup retention.");
}

const apply = process.argv.includes("--apply");
const now = Date.now();
const backupCutoff = now - backupRetentionDays * 86_400_000;
const deletionCutoff = now - deletionManifestRetentionDays * 86_400_000;
const files = await readdir(backupDir, { withFileTypes: true });
const names = new Set(files.filter((entry) => entry.isFile()).map((entry) => entry.name));
const removals = new Set();

for (const name of names) {
  const backupMatch = /^brawl-(\d{8}T\d{6}Z)\.dump$/.exec(name);
  if (backupMatch) {
    const timestamp = parseCompactTimestamp(backupMatch[1]);
    if (timestamp !== null && timestamp < backupCutoff) {
      removals.add(name);
      if (names.has(name + ".json")) removals.add(name + ".json");
      if (names.has(name + ".deletions.json")) removals.add(name + ".deletions.json");
    }
    continue;
  }
  const deletionMatch = /^account-deletions-(\d{8}T\d{6}Z)\.json$/.exec(name);
  if (deletionMatch) {
    const timestamp = parseCompactTimestamp(deletionMatch[1]);
    if (timestamp !== null && timestamp < deletionCutoff) removals.add(name);
  }
}

const ordered = [...removals].sort();
if (!ordered.length) {
  console.log("No expired backup artifacts found.");
  process.exit(0);
}
console.log((apply ? "Deleting" : "Would delete") + " " + ordered.length + " expired artifact(s):");
for (const name of ordered) console.log(" - " + name);
if (!apply) {
  console.log("Dry run only. Re-run with --apply after reviewing the list.");
  process.exit(0);
}
for (const name of ordered) {
  const target = path.resolve(backupDir, name);
  if (path.dirname(target) !== backupDir) throw new Error("Unexpected prune path.");
  await rm(target, { force: true });
}
console.log("Expired backup artifacts deleted.");

function parseDays(value, name) {
  if (!value || !/^\d{1,4}$/.test(value)) throw new Error(name + " is not configured.");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 3650) {
    throw new Error(name + " is invalid.");
  }
  return parsed;
}

function parseCompactTimestamp(value) {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (!match) return null;
  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  );
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
