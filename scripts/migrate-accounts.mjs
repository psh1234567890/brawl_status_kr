import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { getAccountMigrationChecksums } from "./account-migration-checksum.mjs";

const ACCOUNT_MIGRATIONS = [
  {
    version: "0003_account_mvp",
    file: fileURLToPath(new URL("../drizzle/0003_account_mvp.sql", import.meta.url)),
  },
  {
    version: "0004_account_pb_ruleset_v1",
    file: fileURLToPath(new URL("../drizzle/0004_account_pb_ruleset_v1.sql", import.meta.url)),
  },
  {
    version: "0005_account_deletion_safety_ledger",
    file: fileURLToPath(new URL("../drizzle/0005_account_deletion_safety_ledger.sql", import.meta.url)),
  },
];
const ACCOUNT_LOCK_NAMESPACE = 9172381;
const ACCOUNT_LOCK_ID = 3;

function getMigrationUrl() {
  const value = process.env.ACCOUNT_MIGRATION_DATABASE_URL;
  if (!value) {
    throw new Error(
      "ACCOUNT_MIGRATION_DATABASE_URL is required. DATABASE_URL and DIRECT_URL are never used by this runner.",
    );
  }

  if (process.env.VERCEL === "1" || process.env.VERCEL_ENV) {
    throw new Error("Account migrations must run from an explicit operator environment.");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("ACCOUNT_MIGRATION_DATABASE_URL must be a PostgreSQL URL.");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("ACCOUNT_MIGRATION_DATABASE_URL must use PostgreSQL.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (
    !localHosts.has(url.hostname) &&
    process.env.ACCOUNT_MIGRATION_ALLOW_REMOTE !== "1"
  ) {
    throw new Error(
      "Remote account migration targets require ACCOUNT_MIGRATION_ALLOW_REMOTE=1 after the target is verified as isolated.",
    );
  }

  return value;
}

async function runMigration(client, migration, ledgerExists) {
  const sourceSql = await readFile(migration.file, "utf8");
  const { canonicalSql, checksum, acceptedLegacyChecksums } =
    getAccountMigrationChecksums(sourceSql);

  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [
      ACCOUNT_LOCK_NAMESPACE,
      ACCOUNT_LOCK_ID,
    ]);

    const ledger = ledgerExists || migration.version !== "0003_account_mvp"
      ? await client.query(
          "SELECT checksum FROM public.account_schema_migrations WHERE version = $1",
          [migration.version],
        )
      : { rowCount: 0, rows: [] };

    if (ledger.rowCount) {
      const recorded = ledger.rows[0].checksum;
      if (!acceptedLegacyChecksums.has(recorded)) {
        throw new Error(
          `Applied account migration checksum does not match ${migration.version}.`,
        );
      }
      if (recorded !== checksum) {
        await client.query(
          "UPDATE public.account_schema_migrations SET checksum = $2 WHERE version = $1 AND checksum = $3",
          [migration.version, checksum, recorded],
        );
      }
      if (migration.version === "0005_account_deletion_safety_ledger") {
        const safetyLedger = await client.query(
          "SELECT to_regclass('account_safety.deletion_ledger') IS NOT NULL AS exists",
        );
        if (!safetyLedger.rows[0]?.exists) {
          await client.query(canonicalSql);
        }
      }
      await client.query("COMMIT");
      console.log("Account migration already applied; checksum verified:", migration.version);
      return true;
    }

    await client.query(canonicalSql);
    await client.query(
      "INSERT INTO public.account_schema_migrations (version, checksum) VALUES ($1, $2)",
      [migration.version, checksum],
    );
    await client.query("COMMIT");
    console.log("Account migration applied:", migration.version);
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

async function migrateAccounts() {
  const connectionString = getMigrationUrl();
  const { Pool } = pg;
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
    statement_timeout: 10_000,
  });
  const client = await pool.connect();

  try {
    for (const migration of ACCOUNT_MIGRATIONS) {
      const ledger = await client.query(
        "SELECT to_regclass('public.account_schema_migrations') IS NOT NULL AS exists",
      );
      await runMigration(client, migration, ledger.rows[0]?.exists === true);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

try {
  await migrateAccounts();
} catch (error) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "ACCOUNT_MIGRATION_FAILED";
  console.error("Account migration failed:", code);
  process.exitCode = 1;
}
