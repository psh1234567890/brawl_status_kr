import { readFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import {
  applyDeletionManifest,
  verifyDeletionManifest,
} from "./account-deletion-manifest.mjs";

dotenv.config({ path: ".env.local", quiet: true });
const { Client } = pg;
const manifestArgIndex = process.argv.indexOf("--manifest");
const manifestPath = manifestArgIndex >= 0 ? process.argv[manifestArgIndex + 1] : undefined;
if (!manifestPath) {
  throw new Error("Usage: node scripts/reapply-account-deletions.mjs --manifest <absolute manifest path>");
}
const resolvedManifestPath = path.resolve(manifestPath);
if (!path.isAbsolute(resolvedManifestPath) || !resolvedManifestPath.endsWith(".json")) {
  throw new Error("Deletion manifest path must be an absolute JSON path.");
}

const connectionString = process.env.ACCOUNT_RESTORE_DATABASE_URL;
if (!connectionString) throw new Error("ACCOUNT_RESTORE_DATABASE_URL is required.");
const target = new URL(connectionString);
const local = ["localhost", "127.0.0.1", "::1"].includes(target.hostname);
if (!local && process.env.ACCOUNT_RESTORE_ALLOW_REMOTE !== "1") {
  throw new Error("Remote restore target requires ACCOUNT_RESTORE_ALLOW_REMOTE=1.");
}
const secret = process.env.ACCOUNT_DELETION_MANIFEST_SECRET;
const manifest = JSON.parse(await readFile(resolvedManifestPath, "utf8"));
verifyDeletionManifest(manifest, secret);

const client = new Client({ connectionString });
await client.connect();
try {
  const result = await applyDeletionManifest(client, manifest, secret);
  console.log("Deletion manifest reapplied.");
  console.log("Manifest entries: " + result.manifestEntries);
  console.log("Active entries: " + result.activeEntries);
  console.log("Expired entries skipped: " + result.expiredEntries);
  console.log("Restored users removed: " + result.deletedUsers);
} finally {
  await client.end();
}
