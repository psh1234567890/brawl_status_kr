import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { appendFile, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { buildDeletionManifest, readActiveDeletionRows, verifyDeletionManifest } from "./account-deletion-manifest.mjs";
import { encryptAccountArtifact } from "./account-artifact.mjs";
import { ACCOUNT_SNAPSHOT_TABLES, pgServiceValue, readAccountSnapshotConfig } from "./account-snapshot-config.mjs";
import { artifactDeadline } from "./account-artifact-retention.mjs";

// No dotenv and no app DB fallback: scheduled jobs must name their source.
async function main() {
  const config = readAccountSnapshotConfig(process.env);
  const kind = process.argv[2];
  if (!["backup", "manifest"].includes(kind)) throw new Error("Snapshot kind must be backup or manifest.");
  await mkdir(config.outputDir, { recursive: true, mode: 0o700 });
  const realOutput = await realpath(config.outputDir);
  readAccountSnapshotConfig({ ...process.env, ACCOUNT_SNAPSHOT_OUTPUT_DIR: realOutput }, await realpath(process.cwd()));
  restrictWindowsPath(realOutput);
  const temporary = await mkdtemp(path.join(os.tmpdir(), "brawl-account-snapshot-"));
  restrictWindowsPath(temporary);
  const client = new pg.Client({
    connectionString: config.connection.toString(),
    ...(config.target !== "test" ? { ssl: { rejectUnauthorized: true, ...(config.ca ? { ca: config.ca } : {}) } } : {}),
    connectionTimeoutMillis: 15_000,
    query_timeout: 60_000,
  });
  const created = [];
  try {
    await client.connect();
    await client.query("SET default_transaction_read_only = on");
    const schema = await client.query("SELECT to_regclass('account_safety.deletion_ledger') IS NOT NULL AS available");
    if (!schema.rows[0]?.available) throw new Error("The independent deletion safety ledger is required.");
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z") + "-" + randomUUID();
    const backupExpiresAt = Math.floor(Date.now() / 1000) + config.policy.backupRetentionDays * 86_400;
    const context = { target: config.target, projectRef: config.projectRef };
    if (kind === "backup") {
      const version = await client.query("SHOW server_version_num");
      const serverMajor = Math.floor(Number(version.rows[0].server_version_num) / 10000);
      if (!Number.isSafeInteger(serverMajor) || serverMajor < 14 || serverMajor > 30) throw new Error("Unsupported PostgreSQL server version.");
      const dockerTools = process.env.ACCOUNT_PG_TOOLS_DOCKER === "1";
      if (dockerTools && process.platform !== "linux") throw new Error("Docker snapshot tools require a Linux operator runner.");
      const dumpBinary = process.env.ACCOUNT_PG_DUMP_BINARY || "pg_dump";
      const image = "postgres:" + serverMajor + "-alpine";
      const dumpVersion = (dockerTools ? runSafe("docker", ["run", "--rm", image, "pg_dump", "--version"], {}) : runSafe(dumpBinary, ["--version"], {})).trim().match(/PostgreSQL\) (\d+)\./);
      if (!dumpVersion || Number(dumpVersion[1]) < serverMajor) throw new Error("pg_dump must be at least the source server major version.");
      const passFile = path.join(temporary, "pgpass");
      const serviceFile = path.join(temporary, "pg_service.conf");
      const caFile = path.join(temporary, "provider-ca.pem");
      if (config.ca) await writeFile(caFile, config.ca + "\n", { mode: 0o600 });
      await writeFile(passFile, [config.connection.hostname, config.port, config.database, config.username, config.password].map(pgPassValue).join(":") + "\n", { mode: 0o600 });
      const service = ["[account_snapshot]", "host=" + pgServiceValue(config.connection.hostname), "port=" + config.port,
        "dbname=" + pgServiceValue(config.database), "user=" + pgServiceValue(config.username),
        "sslmode=" + (config.target === "test" ? "disable" : "verify-full"),
        ...(config.ca ? ["sslrootcert=" + pgServiceValue(dockerTools ? "/run/account/provider-ca.pem" : caFile)] : []), "connect_timeout=15", ""];
      await writeFile(serviceFile, service.join("\n"), { mode: 0o600 });
      const rawDump = path.join(temporary, "accounts.dump");
      const dumpArgs = ["--dbname=service=account_snapshot", "--format=custom", "--no-password", "--no-owner", "--no-privileges", "--strict-names",
        ...ACCOUNT_SNAPSHOT_TABLES.map((table) => "--table=public." + table), "--file=" + (dockerTools ? "/run/account/accounts.dump" : rawDump)];
      if (dockerTools) {
        runSafe("docker", ["run", "--rm", "--network=host", "--user=" + process.getuid() + ":" + process.getgid(),
          "--mount", "type=bind,source=" + temporary + ",target=/run/account",
          "--env=PGSERVICEFILE=/run/account/pg_service.conf", "--env=PGPASSFILE=/run/account/pgpass",
          "--env=PGOPTIONS=-c default_transaction_read_only=on -c statement_timeout=300000",
          image, "pg_dump", ...dumpArgs], {});
      } else runSafe(dumpBinary, dumpArgs, {
        PGSERVICEFILE: serviceFile, PGPASSFILE: passFile,
        PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=300000",
      });
      const destination = path.join(realOutput, "accounts-" + stamp + ".dump.enc");
      await encryptAccountArtifact(rawDump, destination, config.encryptionKey, { ...context, kind: "backup" });
      created.push(destination);
    }
    // Read AFTER pg_dump: includes deletes committed while the dump ran.
    const rows = await readActiveDeletionRows(client);
    const manifest = buildDeletionManifest({ rows, policy: config.policy, secret: config.manifestSecret });
    verifyDeletionManifest(manifest, config.manifestSecret);
    const rawManifest = path.join(temporary, "deletions.json");
    await writeFile(rawManifest, JSON.stringify(manifest) + "\n", { mode: 0o600 });
    const destination = path.join(realOutput, "account-deletions-" + stamp + ".json.enc");
    await encryptAccountArtifact(rawManifest, destination, config.encryptionKey, { ...context, kind: "manifest" });
    created.push(destination);
    if (process.env.GITHUB_OUTPUT) {
      await appendFile(process.env.GITHUB_OUTPUT, "manifestExpiresAt=" + artifactDeadline(manifest) + "\nbackupExpiresAt=" + backupExpiresAt + "\n");
    }
    console.log("Encrypted account " + kind + " snapshot completed (" + config.target + ").");
  } catch (error) {
    for (const artifact of created) await rm(artifact, { force: true });
    throw error;
  } finally {
    await client.end().catch(() => undefined);
    // Exactly the verified mkdtemp directory, never a caller-computed root.
    if (path.dirname(temporary) !== path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith("brawl-account-snapshot-")) throw new Error("Invalid snapshot temporary path.");
    await rm(temporary, { recursive: true, force: true });
  }
}

function runSafe(command, args, extraEnv) {
  const env = Object.fromEntries(["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP", "HOME"].filter((key) => process.env[key]).map((key) => [key, process.env[key]]));
  const result = spawnSync(command, args, { env: { ...env, ...extraEnv }, encoding: "utf8", windowsHide: true, timeout: 360_000 });
  if (result.status !== 0) throw new Error("PostgreSQL snapshot tool failed; raw output is suppressed.");
  return result.stdout;
}

function pgPassValue(value) { return value.replace(/\\/g, "\\\\").replace(/:/g, "\\:"); }
function restrictWindowsPath(directory) {
  if (process.platform !== "win32") return;
  const user = process.env.USERDOMAIN && process.env.USERNAME ? process.env.USERDOMAIN + "\\" + process.env.USERNAME : process.env.USERNAME;
  if (!user) throw new Error("Unable to restrict snapshot directory permissions.");
  const result = spawnSync("icacls", [directory, "/inheritance:r", "/grant:r", user + ":(OI)(CI)F"], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error("Unable to restrict snapshot directory permissions.");
}

main().catch(() => {
  // pg errors may contain connection data or private account values.
  console.error("Account snapshot failed. Check target, policy, TLS, role permissions and PostgreSQL client configuration; no private error details are logged.");
  process.exitCode = 1;
});
