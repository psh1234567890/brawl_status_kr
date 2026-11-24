// CI-only integration database. Never use production credentials or a shared database.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import pg from "pg";

if (process.env.CI !== "1") throw new Error("Writer integration requires CI=1");
const adminUrl = new URL(process.env.NETLIFY_WRITER_TEST_ADMIN_URL ?? "");
const writerUrl = new URL(process.env.DATABASE_URL ?? "");
for (const url of [adminUrl, writerUrl]) {
  assert(["postgres:", "postgresql:"].includes(url.protocol));
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/brawloop_writer_app_test");
  assert.equal(url.port, "5432");
  assert.equal(url.search, "");
}
assert.equal(adminUrl.username, "postgres");
assert.equal(writerUrl.username, "brawl_netlify_writer");
assert.equal(writerUrl.password, "ci-only-writer-app-password");
const admin = new pg.Client({ connectionString: adminUrl.toString(), connectionTimeoutMillis: 6000 });
await admin.connect();
try {
  const empty = await admin.query("SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')");
  assert.equal(empty.rows[0].count, 0, "Refusing a nonempty database");
  const roles = await admin.query("SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated','brawl_netlify_writer','brawl_netlify_runtime')");
  assert.equal(roles.rowCount, 0, "Refusing preexisting application roles");
  await admin.query(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA cron;
    CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint
      LANGUAGE sql AS $$SELECT 1::bigint$$;
    CREATE TABLE public.battle_logs (
      id serial PRIMARY KEY, player_tag text NOT NULL, battle_time text NOT NULL,
      mode text NOT NULL, map text NOT NULL, brawler_name text NOT NULL,
      result text, rank integer, trophy_change integer, battle_detail text NOT NULL,
      UNIQUE(player_tag,battle_time)
    );
    ALTER TABLE public.battle_logs ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA public TO anon,authenticated;
    GRANT SELECT ON public.battle_logs TO anon,authenticated;
  `);
  const migrationDir = new URL("../drizzle/", import.meta.url);
  const migrations = (await readdir(migrationDir)).filter(name => name.endsWith(".sql") && !name.startsWith("0009_")).sort();
  for (const name of migrations) {
    await admin.query("BEGIN;\n" + await readFile(new URL(name, migrationDir), "utf8") + "\nCOMMIT;");
  }
  await admin.query(await readFile(new URL("./netlify-runtime-role.sql", import.meta.url), "utf8"));
  await admin.query("ALTER ROLE brawl_netlify_runtime LOGIN; ALTER ROLE brawl_netlify_runtime SET default_transaction_read_only=on;");
  await admin.query(await readFile(new URL("./netlify-preview-strict-readonly.sql", import.meta.url), "utf8"));
  await admin.query(await readFile(new URL("./netlify-production-writer-role.sql", import.meta.url), "utf8"));
  // Fixed disposable-only password, guarded above. No production role is created.
  await admin.query("ALTER ROLE brawl_netlify_writer LOGIN PASSWORD 'ci-only-writer-app-password';");
  const writer = new pg.Client({ connectionString: writerUrl.toString(), connectionTimeoutMillis: 6000 });
  await writer.connect();
  try {
    const identity = await writer.query("SELECT current_user AS role, current_database() AS db");
    assert.equal(identity.rows[0].role, "brawl_netlify_writer");
    assert.equal(identity.rows[0].db, "brawloop_writer_app_test");
    const denied = await writer.query("SELECT has_table_privilege(current_user,'public.auth_users','TRUNCATE') AS truncate_allowed");
    assert.equal(denied.rows[0].truncate_allowed, false);
  } finally { await writer.end(); }
  console.log(JSON.stringify({ prepared: true, migrations: migrations.length, role: "brawl_netlify_writer", disposable: true }));
} finally { await admin.end(); }
