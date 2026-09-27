import path from "node:path";

// libpq service files use literal INI values, not conninfo quoting/escaping.
// Reject line injection and trailing whitespace that libpq would strip.
export function pgServiceValue(value) {
  if (typeof value !== "string" || !value || /[\r\n\u0000]/u.test(value) || /\s$/u.test(value) || Buffer.byteLength(value, "utf8") > 900) {
    throw new Error("Invalid PostgreSQL service configuration value.");
  }
  return value;
}

export const ACCOUNT_SNAPSHOT_TABLES = Object.freeze([
  "auth_users", "auth_accounts", "auth_sessions", "auth_verifications",
  "minigame_personal_bests", "account_sync_receipts", "account_rate_limits",
  "account_deletion_tombstones", "account_schema_migrations",
]);

export function readAccountSnapshotConfig(env, repoRoot = process.cwd()) {
  if (env.ACCOUNT_SNAPSHOT_ENABLED !== "1") throw new Error("Account snapshots are disabled.");
  const target = env.ACCOUNT_SNAPSHOT_TARGET;
  if (!["test", "staging", "production"].includes(target)) throw new Error("Explicit snapshot target is required.");
  let connection;
  try { connection = new URL(env.ACCOUNT_SNAPSHOT_DATABASE_URL); } catch { throw new Error("Explicit snapshot database URL is required."); }
  if (!["postgres:", "postgresql:"].includes(connection.protocol) || connection.hash) throw new Error("Invalid snapshot database URL.");
  const projectRef = env.ACCOUNT_SNAPSHOT_PROJECT_REF;
  const username = decodeURIComponent(connection.username);
  const password = decodeURIComponent(connection.password);
  const database = decodeURIComponent(connection.pathname.slice(1));
  if (!username || !password || !database || [username, password, database].some((value) => /[\r\n\u0000]/u.test(value))) {
    throw new Error("Invalid snapshot database credentials.");
  }
  const port = connection.port || "5432";
  if (target === "test") {
    if (!["localhost", "127.0.0.1", "[::1]"].includes(connection.hostname) || !database.endsWith("_test") || projectRef !== "isolated-test") {
      throw new Error("Test snapshots require a loopback test database.");
    }
  } else {
    const expectedRef = target === "staging" ? "yxukggorpqsrwurbamxv" : "vzsxfanekkaoiwnpscih";
    if (projectRef !== expectedRef || port !== "5432" ||
        !(connection.hostname === "db." + expectedRef + ".supabase.co" ||
          (/^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(connection.hostname) && username.endsWith("." + expectedRef)))) {
      throw new Error("Snapshot project or session-pooler target mismatch.");
    }
    if (target === "production" && env.ACCOUNT_SNAPSHOT_ALLOW_PRODUCTION !== "1") {
      throw new Error("Production snapshots require explicit activation.");
    }
  }
  // URL/environment TLS overrides never weaken the verified connection.
  for (const name of [...connection.searchParams.keys()]) {
    if (!["sslmode", "ssl", "uselibpqcompat"].includes(name)) throw new Error("Unsupported snapshot connection option.");
    connection.searchParams.delete(name);
  }
  const ca = env.ACCOUNT_SNAPSHOT_SSL_CA?.replace(/\\n/g, "\n").trim();
  if (ca && (!ca.includes("-----BEGIN CERTIFICATE-----") || !ca.includes("-----END CERTIFICATE-----"))) {
    throw new Error("Invalid snapshot TLS certificate.");
  }
  const version = env.ACCOUNT_BACKUP_RETENTION_POLICY_VERSION;
  const backupRetentionDays = Number(env.ACCOUNT_BACKUP_RETENTION_DAYS);
  const deletionManifestRetentionDays = Number(env.ACCOUNT_DELETION_MANIFEST_RETENTION_DAYS);
  if (!version || !/^[a-zA-Z0-9._-]{1,64}$/.test(version) ||
      !Number.isSafeInteger(backupRetentionDays) || backupRetentionDays < 1 || backupRetentionDays > 3650 ||
      !Number.isSafeInteger(deletionManifestRetentionDays) || deletionManifestRetentionDays <= backupRetentionDays || deletionManifestRetentionDays > 3650) {
    throw new Error("Invalid explicit snapshot retention policy.");
  }
  if ((env.ACCOUNT_DELETION_MANIFEST_SECRET?.length ?? 0) < 32 || !/^[a-f0-9]{64}$/i.test(env.ACCOUNT_BACKUP_ENCRYPTION_KEY ?? "")) {
    throw new Error("Snapshot signing/encryption secrets are not configured.");
  }
  if (!env.ACCOUNT_SNAPSHOT_OUTPUT_DIR || !path.isAbsolute(env.ACCOUNT_SNAPSHOT_OUTPUT_DIR)) throw new Error("Absolute snapshot output directory is required.");
  const outputDir = path.resolve(env.ACCOUNT_SNAPSHOT_OUTPUT_DIR);
  const relative = path.relative(path.resolve(repoRoot), outputDir);
  if (!relative || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative))) {
    throw new Error("Snapshot output must be outside the repository.");
  }
  return {
    target, projectRef, connection, username, password, database, port, ca, outputDir,
    policy: { version, backupRetentionDays, deletionManifestRetentionDays },
    manifestSecret: env.ACCOUNT_DELETION_MANIFEST_SECRET, encryptionKey: env.ACCOUNT_BACKUP_ENCRYPTION_KEY,
  };
}
