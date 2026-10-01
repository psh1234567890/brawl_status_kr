import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, rename, rm, stat, writeFile } from "node:fs/promises";
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
const backupDir = path.resolve(
  outputArgIndex >= 0 && process.argv[outputArgIndex + 1]
    ? process.argv[outputArgIndex + 1]
    : path.join(defaultRoot, "BrawlStatusKR", "backups"),
);

if (isInside(repoRoot, backupDir)) {
  throw new Error("Backup output must be outside the repository.");
}

const sourceEnv = process.env.DIRECT_URL ? "DIRECT_URL" : "DATABASE_URL";
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Database connection environment is missing.");

const connection = new URL(connectionString);
const port = connection.port || "5432";
if (sourceEnv === "DATABASE_URL" && port === "6543") {
  throw new Error("Transaction-pooler connections are not allowed for backups. Configure DIRECT_URL or a session-pooler connection.");
}

await mkdir(backupDir, { recursive: true, mode: 0o700 });
restrictWindowsPath(backupDir, true);

const sourceSnapshot = await inspectSource(connectionString);
const image = `postgres:${sourceSnapshot.serverMajor}-alpine`;
ensureDocker(image);

const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const baseName = `brawl-${timestamp}`;
const finalName = `${baseName}.dump`;
const partialName = `${finalName}.partial`;
const finalPath = path.join(backupDir, finalName);
const partialPath = path.join(backupDir, partialName);
const manifestPath = `${finalPath}.json`;
const tempDir = await mkdtemp(path.join(os.tmpdir(), "brawl-db-backup-"));
let deletionArtifactPath = null;

try {
  restrictWindowsPath(tempDir, true);
  const serviceFile = path.join(tempDir, "pg_service.conf");
  const passFile = path.join(tempDir, "pgpass.conf");
  const dbName = decodeURIComponent(connection.pathname.replace(/^\//, ""));
  const user = decodeURIComponent(connection.username);
  const password = decodeURIComponent(connection.password);
  const sslmode = connection.searchParams.get("sslmode") || "require";

  await writeFile(
    serviceFile,
    [
      "[brawl_backup]",
      `host=${serviceValue(connection.hostname)}`,
      `port=${serviceValue(port)}`,
      `dbname=${serviceValue(dbName)}`,
      `user=${serviceValue(user)}`,
      `sslmode=${serviceValue(sslmode)}`,
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  await writeFile(
    passFile,
    `${escapePgPass(connection.hostname)}:${escapePgPass(port)}:${escapePgPass(dbName)}:${escapePgPass(user)}:${escapePgPass(password)}\n`,
    { mode: 0o600 },
  );
  restrictWindowsPath(serviceFile, false);
  restrictWindowsPath(passFile, false);

  const commonMounts = [
    "--rm",
    "-v", `${tempDir}:/run/pg:ro`,
    "-v", `${backupDir}:/backup`,
    "-e", "PGSERVICEFILE=/run/pg/pg_service.conf",
    image,
  ];

  const pgShellPrefix = [
    "cp /run/pg/pgpass.conf /tmp/pgpass.conf",
    "chmod 600 /tmp/pgpass.conf",
    "export PGPASSFILE=/tmp/pgpass.conf",
  ];

  runSafe(
    "docker",
    [
      "run",
      ...commonMounts,
      "sh",
      "-ec",
      [...pgShellPrefix, "exec psql --dbname=service=brawl_backup --no-password -Atc 'select 1' >/dev/null"].join("; "),
    ],
    "database connection preflight",
  );

  runSafe(
    "docker",
    [
      "run",
      ...commonMounts,
      "sh",
      "-ec",
      [...pgShellPrefix, "exec pg_dump --dbname=service=brawl_backup --schema=public --schema-only --no-password --file=/dev/null"].join("; "),
    ],
    "pg_dump schema preflight",
  );

  runSafe(
    "docker",
    [
      "run",
      ...commonMounts,
      "sh",
      "-ec",
      [
        ...pgShellPrefix,
        `exec pg_dump --dbname=service=brawl_backup --format=custom --schema=public --no-password --file=/backup/${partialName}`,
      ].join("; "),
    ],
    "pg_dump",
  );

  runSafe(
    "docker",
    ["run", "--rm", "-v", `${backupDir}:/backup:ro`, image, "pg_restore", "--list", `/backup/${partialName}`],
    "pg_restore --list",
  );

  const fileInfo = await stat(partialPath);
  if (fileInfo.size <= 0) throw new Error("Backup archive is empty.");
  const sha256 = await sha256File(partialPath);
  await rename(partialPath, finalPath);

  const deletionBundle = await writeDeletionManifestForBackup(
    finalPath,
    backupDir,
    sourceSnapshot,
  );
  deletionArtifactPath = deletionBundle?.filePath ?? null;

  const manifest = {
    createdAt: new Date().toISOString(),
    archive: finalName,
    sha256,
    sizeBytes: fileInfo.size,
    scope: "public schema",
    sourceEnv,
    serverVersionNum: sourceSnapshot.serverVersionNum,
    serverMajor: sourceSnapshot.serverMajor,
    battleLogs: sourceSnapshot.battleLogs,
    requiredIndexes: sourceSnapshot.requiredIndexes,
    rls: sourceSnapshot.rls,
    account: sourceSnapshot.account,
    deletionManifest: deletionBundle?.metadata ?? null,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  restrictWindowsPath(finalPath, false);
  restrictWindowsPath(manifestPath, false);
  if (deletionBundle) {
    await publishLatestDeletionManifest(backupDir, deletionBundle.body);
  }

  console.log(`Backup created: ${finalPath}`);
  console.log(`Size: ${fileInfo.size} bytes`);
  console.log(`SHA256: ${sha256}`);
  console.log(`Source rows: ${sourceSnapshot.battleLogs.total}`);
  console.log(`PostgreSQL: ${sourceSnapshot.serverVersionNum} (client image ${image})`);
} catch (error) {
  await rm(partialPath, { force: true }).catch(() => {});
  await rm(finalPath, { force: true }).catch(() => {});
  await rm(manifestPath, { force: true }).catch(() => {});
  if (deletionArtifactPath) {
    await rm(deletionArtifactPath, { force: true }).catch(() => {});
  }
  throw error;
} finally {
  await rm(tempDir, { recursive: true, force: true }).catch(() => {});
}

async function inspectSource(connectionString) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query("SET default_transaction_read_only = on");
    const versionResult = await client.query("SHOW server_version_num");
    const serverVersionNum = String(versionResult.rows[0].server_version_num);
    const serverMajor = Math.floor(Number(serverVersionNum) / 10000);
    if (!Number.isFinite(serverMajor) || serverMajor < 10) throw new Error("Unsupported PostgreSQL server version.");

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
    const accountTablesResult = await client.query(
      "SELECT to_regclass('public.auth_users') IS NOT NULL AS users, to_regclass('public.account_deletion_tombstones') IS NOT NULL AS tombstones",
    );
    let account = null;
    let accountDeletionRows = [];
    if (accountTablesResult.rows[0]?.users) {
      const usersResult = await client.query("SELECT count(*)::int AS total FROM public.auth_users");
      if (accountTablesResult.rows[0]?.tombstones) {
        accountDeletionRows = await readActiveDeletionRows(client);
      }
      account = {
        users: Number(usersResult.rows[0]?.total ?? 0),
        activeDeletionTombstones: accountDeletionRows.length,
      };
    }
    return {
      serverVersionNum,
      serverMajor,
      battleLogs: battleRows[0],
      requiredIndexes: indexRows.map((row) => row.indexname),
      rls: rlsRows[0] ?? null,
      account,
      accountDeletionRows,
    };
  } finally {
    await client.end();
  }
}

async function writeDeletionManifestForBackup(finalPath, backupDir, sourceSnapshot) {
  if (!sourceSnapshot.account) return null;
  const hasAccountData =
    sourceSnapshot.account.users > 0 || sourceSnapshot.account.activeDeletionTombstones > 0;
  if (!hasAccountData) return null;

  const policy = readBackupRetentionPolicy();
  const secret = process.env.ACCOUNT_DELETION_MANIFEST_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Account data is present but ACCOUNT_DELETION_MANIFEST_SECRET is not configured.");
  }
  const deletionManifest = buildDeletionManifest({
    rows: sourceSnapshot.accountDeletionRows,
    policy,
    secret,
  });
  const body = JSON.stringify(deletionManifest, null, 2) + "\n";
  const manifestFile = path.basename(finalPath) + ".deletions.json";
  const manifestFilePath = path.join(backupDir, manifestFile);
  await writeFile(manifestFilePath, body, { mode: 0o600 });
  restrictWindowsPath(manifestFilePath, false);
  return {
    filePath: manifestFilePath,
    body,
    metadata: {
      file: manifestFile,
      sha256: createHash("sha256").update(body).digest("hex"),
      entries: deletionManifest.entries.length,
      exportedAt: deletionManifest.exportedAt,
      policyVersion: deletionManifest.policyVersion,
    },
  };
}

async function publishLatestDeletionManifest(backupDir, body) {
  const latestPath = path.join(backupDir, "account-deletions-latest.json");
  const latestPartial = latestPath + ".partial";
  await writeFile(latestPartial, body, { mode: 0o600 });
  restrictWindowsPath(latestPartial, false);
  await rename(latestPartial, latestPath);
}

function readBackupRetentionPolicy() {
  const version = process.env.ACCOUNT_BACKUP_RETENTION_POLICY_VERSION?.trim();
  const backupRetentionDays = Number(process.env.ACCOUNT_BACKUP_RETENTION_DAYS);
  const deletionManifestRetentionDays = Number(
    process.env.ACCOUNT_DELETION_MANIFEST_RETENTION_DAYS,
  );
  if (
    !version ||
    !/^[a-zA-Z0-9._-]{1,64}$/.test(version) ||
    !Number.isSafeInteger(backupRetentionDays) ||
    backupRetentionDays < 1 ||
    !Number.isSafeInteger(deletionManifestRetentionDays) ||
    deletionManifestRetentionDays <= backupRetentionDays
  ) {
    throw new Error(
      "Account data is present but backup/deletion-manifest retention policy is not configured.",
    );
  }
  return { version, backupRetentionDays, deletionManifestRetentionDays };
}

function ensureDocker(image) {
  runSafe("docker", ["info", "--format", "{{.ServerVersion}}"], "Docker engine");
  const inspect = spawnSync("docker", ["image", "inspect", image], { encoding: "utf8", windowsHide: true });
  if (inspect.status !== 0) runSafe("docker", ["pull", image], "Docker image pull");
  runSafe("docker", ["run", "--rm", image, "pg_dump", "--version"], "pg_dump version check");
}

function runSafe(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) {
    const category = classifyProcessError(result.stderr);
    throw new Error(
      `${label} failed with exit code ${result.status ?? "unknown"}${category ? ` (${category})` : ""}.`,
    );
  }
  return result.stdout.trim();
}

function classifyProcessError(stderr = "") {
  const text = String(stderr).toLowerCase();
  if (text.includes("password authentication failed")) return "authentication failed";
  if (text.includes("no password supplied")) return "password file was not accepted";
  if (text.includes("tenant or user not found")) return "pooler tenant/user mismatch";
  if (text.includes("permission denied")) return "database permission denied";
  if (text.includes("could not translate host name")) return "DNS resolution failed";
  if (text.includes("network is unreachable")) return "network unreachable";
  if (text.includes("connection refused")) return "connection refused";
  if (text.includes("timeout expired") || text.includes("connection timed out")) return "connection timeout";
  if (text.includes("certificate") || text.includes("ssl error") || text.includes("tls")) return "TLS/SSL failure";
  if (text.includes("pg_hba.conf")) return "server connection policy rejected the client";
  if (text.includes("service file") || text.includes("definition of service")) return "libpq service configuration invalid";
  if (text.includes("could not open output file")) return "backup output file could not be opened";
  if (text.includes("server closed the connection unexpectedly")) return "server closed the connection unexpectedly";
  if (text.includes("unsupported startup parameter")) return "unsupported startup parameter";
  if (text.includes("query failed")) return "database query failed during dump";
  if (text.includes("aborting because of server version mismatch")) return "pg_dump/server version mismatch";
  if (text.includes("database") && text.includes("does not exist")) return "database not found";
  if (text.includes("server version") && text.includes("pg_dump version")) return "pg_dump/server version mismatch";
  return "unclassified database client error";
}

function restrictWindowsPath(target, directory) {
  if (process.platform !== "win32") return;
  const user = process.env.USERDOMAIN && process.env.USERNAME
    ? `${process.env.USERDOMAIN}\\${process.env.USERNAME}`
    : process.env.USERNAME;
  if (!user) throw new Error("Unable to determine the current Windows user for ACL restriction.");
  const grant = directory ? `${user}:(OI)(CI)F` : `${user}:F`;
  const result = spawnSync("icacls", [target, "/inheritance:r", "/grant:r", grant], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error("Failed to restrict backup credential/file permissions.");
}

function serviceValue(value) {
  const text = String(value);
  if (/[\r\n]/.test(text)) throw new Error("Invalid newline in libpq service value.");
  return text;
}

function escapePgPass(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/:/g, "\\:");
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}
