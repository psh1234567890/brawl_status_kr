// Destructive only to synthetic tables in disposable CI PostgreSQL.
// The guard deliberately refuses all non-loopback and non-test databases.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import pg from "pg";

const connection = process.env.NETLIFY_READONLY_TEST_DATABASE_URL;
if (!["1", "true"].includes(process.env.CI ?? "")) {
  throw new Error("Netlify role rehearsal is restricted to CI");
}
if (!connection) throw new Error("Missing disposable test database URL");
const target = new URL(connection);
if (!["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) ||
    !/^\/[a-z0-9_]+_test$/i.test(target.pathname) ||
    target.username !== "postgres") {
  throw new Error("Netlify role rehearsal refuses non-disposable databases");
}

const roleName = "brawl_netlify_runtime";
const fixtureName = "__netlify_readonly_fixture";
const schemas = ["public", "analytics_private", "account_safety"];
const client = new pg.Client({ connectionString: connection, connectionTimeoutMillis: 6000 });
const hardening = await readFile(new URL("./netlify-preview-strict-readonly.sql", import.meta.url), "utf8");
let roleCreated = false;
let verified = 0;

function assertRight(condition, description) {
  assert(condition, description);
  verified++;
}

try {
  await client.connect();
  const { rows: existing } = await client.query(
    "SELECT 1 FROM pg_roles WHERE rolname = $1", [roleName],
  );
  assertRight(existing.length === 0, "Refusing existing runtime role even in CI");
  await client.query(
    "CREATE ROLE brawl_netlify_runtime LOGIN NOINHERIT NOCREATEDB NOCREATEROLE",
  );
  roleCreated = true;
  await client.query("ALTER ROLE brawl_netlify_runtime SET default_transaction_read_only = on");

  for (const schema of schemas) {
    if (schema !== "public") await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    const relation = `${schema}.${fixtureName}`;
    await client.query(`CREATE TABLE ${relation}(id integer PRIMARY KEY)`);
    await client.query(`INSERT INTO ${relation}(id) VALUES (1)`);
    await client.query(`ALTER TABLE ${relation} ENABLE ROW LEVEL SECURITY`);
    await client.query(
      `CREATE POLICY netlify_fixture_read ON ${relation} FOR SELECT TO ${roleName} USING (true)`,
    );
    await client.query(
      `CREATE POLICY netlify_fixture_insert ON ${relation} FOR INSERT TO ${roleName} WITH CHECK (true)`,
    );
    await client.query(
      `GRANT USAGE ON SCHEMA ${schema} TO ${roleName}`,
    );
    await client.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ${relation} TO ${roleName}`,
    );
  }
  await client.query("CREATE SEQUENCE public.__netlify_readonly_fixture_seq");
  await client.query(
    "GRANT USAGE, UPDATE, SELECT ON SEQUENCE public.__netlify_readonly_fixture_seq TO brawl_netlify_runtime",
  );

  let r = await client.query(
    "SELECT has_table_privilege($1, $2, 'INSERT') AS allowed",
    [roleName, `public.${fixtureName}`],
  );
  assertRight(r.rows[0].allowed, "Fixture must start with DML privileges");
  await client.query(hardening);
  await client.query(hardening); // Must remain safe when applied twice.

  for (const schema of schemas) {
    r = await client.query(
      `SELECT
        has_table_privilege($1, $2, 'SELECT') AS can_read,
        has_table_privilege($1, $2, 'INSERT') AS can_insert,
        has_table_privilege($1, $2, 'UPDATE') AS can_update,
        has_table_privilege($1, $2, 'DELETE') AS can_delete`,
      [roleName, `${schema}.${fixtureName}`],
    );
    const access = r.rows[0];
    assertRight(access.can_read, `${schema}: SELECT must remain`);
    assertRight(!access.can_insert && !access.can_update && !access.can_delete,
      `${schema}: writes must be forbidden`);
  }
  r = await client.query(
    `SELECT
      has_sequence_privilege($1,'public.__netlify_readonly_fixture_seq','USAGE') AS can_use,
      has_sequence_privilege($1,'public.__netlify_readonly_fixture_seq','UPDATE') AS can_update,
      has_sequence_privilege($1,'public.__netlify_readonly_fixture_seq','SELECT') AS can_read`,
    [roleName],
  );
  assertRight(Object.values(r.rows[0]).every(value => !value), "All sequence access must be revoked");

  await client.query("BEGIN");
  try {
    await client.query(`SET LOCAL ROLE ${roleName}`);
    r = await client.query(`SELECT id FROM public.${fixtureName}`);
    assertRight(r.rows.length === 1, "The runtime role must still read public metadata");
    await assert.rejects(
      client.query(`INSERT INTO public.${fixtureName}(id) VALUES (2)`),
      error => error.code === "42501",
      "Explicit INSERT must fail even if a session attempts to write",
    );
    verified++;
  } finally {
    await client.query("ROLLBACK");
  }

  // Simulate a dangerous blanket PUBLIC grant; the postflight must reject and
  // atomically roll back rather than proclaim a falsely read-only role.
  await client.query(`GRANT INSERT ON public.${fixtureName} TO PUBLIC`);
  try {
    await assert.rejects(
      client.query(hardening),
      error => /Effective table write privilege remains/.test(error.message),
      "Unexpected PUBLIC grants must fail closed",
    );
    verified++;
  } finally {
    // A failed multi-statement PostgreSQL batch leaves the session inside an
    // aborted transaction. Clear it explicitly before subsequent cleanup.
    await client.query("ROLLBACK");
    await client.query(`REVOKE INSERT ON public.${fixtureName} FROM PUBLIC`);
  }

  console.log(JSON.stringify({ passed: true, assertions: verified, disposableDb: true, livePrivilegesChanged: false }));
} finally {
  if (roleCreated) {
    try { await client.query("ROLLBACK"); } catch { /* already outside a transaction */ }
    for (const schema of schemas) {
      try { await client.query(`DROP TABLE IF EXISTS ${schema}.${fixtureName} CASCADE`); } catch { /* cleanup continues */ }
    }
    try { await client.query("DROP SEQUENCE IF EXISTS public.__netlify_readonly_fixture_seq"); } catch { /* cleanup continues */ }
    try { await client.query(`DROP OWNED BY ${roleName} CASCADE`); } catch { /* cleanup continues */ }
    await client.query(`DROP ROLE ${roleName}`);
  }
  await client.end();
}
