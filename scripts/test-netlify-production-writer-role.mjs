// Exercises the operator migration on a disposable PostgreSQL 17 container.
// No production credentials, network, published port, or host data mounts.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const container = "brawloop-writer-role-test-" + randomUUID().slice(0, 12);
const runtime = "brawl_netlify_writer";
let started = false;
let passed = 0;

function docker(args, input, allowFailure = false) {
  const result = spawnSync("docker", args, {
    encoding: "utf8", input, timeout: 90_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (!allowFailure && (result.error || result.status !== 0)) {
    throw new Error("Isolated Docker check failed: " + (result.error?.message ?? result.stderr));
  }
  return result;
}

function sql(source, user = "postgres", allowFailure = false) {
  return docker([
    "exec", "-i", container, "psql", "-X", "-U", user, "-d", "postgres",
    "-v", "ON_ERROR_STOP=1", "-qAt",
  ], source, allowFailure);
}
function expectSql(source, expected, user = runtime) {
  assert.equal(sql(source, user).stdout.trim(), expected);
  passed++;
}
function expectDenied(source, user = runtime) {
  const result = sql(source, user, true);
  assert.notEqual(result.status, 0, "Unexpected successful SQL: " + source);
  assert.match(result.stderr, /permission denied|must be owner|must have|not permitted|not allowed/i);
  passed++;
}
const fixtureId = "00000000-0000-4000-8000-000000000001";
const postId = "00000000-0000-4000-8000-000000000002";
const imageId = "00000000-0000-4000-8000-000000000003";
const ledgerId = "00000000-0000-4000-8000-000000000004";
try {
  docker(["run", "--rm", "--pull=never", "--detach", "--name", container,
    "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17-alpine"]);
  started = true;
  let ready = false;
  for (let i = 0; i < 30; i++) {
    const check = docker(["exec", container, "pg_isready", "-U", "postgres"], undefined, true);
    if (check.status === 0) {
      // The entrypoint uses a temporary init server. Check the final process.
      const final = docker(["exec", container, "sh", "-c", "test \"$(cat /proc/1/comm)\" = postgres"], undefined, true);
      if (final.status === 0) { ready = true; break; }
    }
    await delay(1000);
  }
  assert(ready, "Isolated PostgreSQL did not become ready");

  // Real repository migrations, with only cron scheduling replaced by an
  // inert test stub. No cron extension/job is installed on production.
  sql(`
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
  const migrations = readdirSync(migrationDir).filter(name =>
    name.endsWith(".sql") && !name.startsWith("0009_")).sort();
  for (const name of migrations) {
    sql("BEGIN;\n" + readFileSync(new URL(name, migrationDir), "utf8") + "\nCOMMIT;");
  }
  const migration = readFileSync(new URL("./netlify-production-writer-role.sql", import.meta.url), "utf8");
  // Rehearse the existing preview reader first, then independently create the writer.
  const reader = "brawl_netlify_runtime";
  sql(readFileSync(new URL("./netlify-runtime-role.sql", import.meta.url), "utf8"));
  sql("ALTER ROLE brawl_netlify_runtime LOGIN; ALTER ROLE brawl_netlify_runtime SET default_transaction_read_only = on;");
  sql(readFileSync(new URL("./netlify-preview-strict-readonly.sql", import.meta.url), "utf8"));
  const readerSnapshot = () => sql(`
    SELECT jsonb_build_object(
      'role', (SELECT to_jsonb(r) FROM pg_roles r WHERE rolname='brawl_netlify_runtime'),
      'relations', (SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,
          has_table_privilege('brawl_netlify_runtime',c.oid,'SELECT'),
          has_table_privilege('brawl_netlify_runtime',c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),
          has_any_column_privilege('brawl_netlify_runtime',c.oid,'INSERT,UPDATE,REFERENCES'))
          ORDER BY n.nspname,c.relname)
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','analytics_private','account_safety')
        AND c.relkind IN ('r','p','v','m','f')),
      'sequences', (SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,
          has_sequence_privilege('brawl_netlify_runtime',c.oid,'USAGE,SELECT,UPDATE'))
          ORDER BY n.nspname,c.relname)
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','analytics_private','account_safety') AND c.relkind='S')
    );
  `).stdout.trim();
  const before = readerSnapshot();
  const snapshot = JSON.parse(before);
  assert(snapshot.relations.some(row => row[2]), "Reader must retain SELECT");
  assert(snapshot.relations.every(row => !row[3] && !row[4]), "Reader must not retain writes");
  assert((snapshot.sequences ?? []).every(row => !row[2]), "Reader must not retain sequences");
  passed += 3;
  sql(migration);
  assert.equal(readerSnapshot(), before, "Writer migration must not change reader privileges");
  passed++;
  expectDenied("SET default_transaction_read_only=off;\nINSERT INTO public.auth_users(name,email) VALUES ('denied','denied@example.invalid');", reader);
  expectDenied("SET ROLE brawl_netlify_writer;", reader);
  expectSql("SELECT (NOT rolcanlogin AND NOT rolsuper AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolbypassrls AND NOT rolinherit AND NOT rolreplication)::text FROM pg_roles WHERE rolname='brawl_netlify_writer';", "true", "postgres");
  // Only the disposable database enables LOGIN, using isolated socket trust.
  sql("ALTER ROLE brawl_netlify_writer LOGIN;");
  sql(`
    INSERT INTO public.auth_users(id,name,email)
      VALUES ('${fixtureId}','BS-FIXTURE','runtime-fixture@example.invalid');
    INSERT INTO public.auth_accounts(user_id,provider_id,account_id)
      VALUES ('${fixtureId}','google','fixture-provider-subject');
    INSERT INTO public.auth_sessions(user_id,token,expires_at)
      VALUES ('${fixtureId}','fixture-session',now()+interval '1 day');
    UPDATE public.auth_users SET name='BS-VERIFIED' WHERE id='${fixtureId}';
    INSERT INTO public.community_profiles(user_id,alias,rules_version)
      VALUES ('${fixtureId}','Loop-ABCDEF012345','fixture');
    INSERT INTO public.community_posts(id,author_id,locale,title,body,evidence_urls,status)
      VALUES ('${postId}','${fixtureId}','ko','Fixture title','Fixture community post body','[]'::jsonb,'published');
    INSERT INTO public.community_image_objects(object_path)
      VALUES ('community/${imageId}.webp');
    INSERT INTO public.community_images(id,owner_id,object_path,width,height,byte_size)
      VALUES ('${imageId}','${fixtureId}','community/${imageId}.webp',10,10,100);
    UPDATE public.community_images SET ready=true,post_id='${postId}' WHERE id='${imageId}';
    INSERT INTO public.battle_logs(player_tag,battle_time,mode,map,brawler_name,result,battle_detail)
      VALUES ('FIXTURE','20261123T000000.000Z','gemGrab','Fixture map','Shelly','victory','{}');
    INSERT INTO public.battle_team_participants(battle_fingerprint,mode,map,team_index,player_tag,brawler_name,result)
      VALUES ('fixture-fingerprint','gemGrab','Fixture map',0,'FIXTURE','Shelly','victory');
    INSERT INTO analytics_private.usage_hourly(hour_bucket,event_kind,event_count)
      VALUES(date_trunc('hour',now()),'page_view',1)
      ON CONFLICT(hour_bucket,event_kind) DO UPDATE SET event_count=analytics_private.usage_hourly.event_count+1;
    INSERT INTO analytics_private.usage_hourly(hour_bucket,event_kind,event_count)
      VALUES(date_trunc('hour',now()),'page_view',1)
      ON CONFLICT(hour_bucket,event_kind) DO UPDATE SET event_count=analytics_private.usage_hourly.event_count+1;
    INSERT INTO account_safety.deletion_ledger(user_id,expires_at,policy_version)
      VALUES ('${ledgerId}', now()+interval '1 day','fixture');
  `, runtime);
  passed++;
  expectSql("SELECT name FROM public.auth_users WHERE id='" + fixtureId + "';", "BS-VERIFIED");
  expectSql("SELECT count(*) FROM public.auth_sessions WHERE user_id='" + fixtureId + "';", "1");
  expectSql("SELECT ready FROM public.community_images WHERE id='" + imageId + "';", "t");
  expectSql("SELECT event_count FROM analytics_private.usage_lifetime WHERE event_kind='page_view';", "2");
  expectSql("SELECT count(*) FROM public.battle_logs;", "1");
  expectSql("SELECT count(*) FROM public.battle_team_participants;", "1");
  expectSql("SELECT count(*) FROM analytics_private.meta_brawler_quality_snapshot;", "0");
  expectSql("SELECT count(*) FROM analytics_private.collection_status_snapshot;", "1");
  expectSql("WITH removed AS (DELETE FROM account_safety.deletion_ledger WHERE user_id='" + ledgerId + "' RETURNING 1) SELECT count(*) FROM removed;", "0");

  // The application may read/write only these specific business tables;
  // direct anonymous users, schema writes and administrator impersonation fail.
  expectDenied("DELETE FROM public.battle_logs;");
  expectDenied("UPDATE public.battle_team_participants SET brawler_name='bad';");
  expectDenied("TRUNCATE public.auth_users CASCADE;");
  expectDenied("SELECT * FROM public.account_schema_migrations;");
  expectDenied("SELECT * FROM analytics_private.consented_search_details;");
  expectDenied("SELECT * FROM analytics_private.meta_brawler_snapshot;");
  expectDenied("CREATE TABLE public.runtime_should_not_create(id integer);");
  expectDenied("SET ROLE postgres;");
  expectDenied("ALTER ROLE brawl_netlify_writer BYPASSRLS;");
  expectDenied("REFRESH MATERIALIZED VIEW analytics_private.collection_status_snapshot;");
  expectDenied("DELETE FROM analytics_private.usage_lifetime;");
  expectSql("SELECT has_table_privilege('anon','public.auth_users','SELECT')::text;", "false", "postgres");
  expectSql("SELECT has_table_privilege('authenticated','public.auth_sessions','SELECT')::text;", "false", "postgres");
  expectSql("SELECT has_schema_privilege('anon','account_safety','USAGE')::text;", "false", "postgres");
  expectSql("SELECT has_schema_privilege('authenticated','analytics_private','USAGE')::text;", "false", "postgres");
  // Test a real transaction rollback under the writer, not the admin role.
  sql("BEGIN; UPDATE public.auth_users SET name='ROLLBACK-FIXTURE' WHERE id='" + fixtureId + "'; ROLLBACK;", runtime);
  expectSql("SELECT name FROM public.auth_users WHERE id='" + fixtureId + "';", "BS-VERIFIED");
  expectSql("SELECT name FROM public.auth_users WHERE id='" + fixtureId + "';", "BS-VERIFIED", reader);
  assert.equal(readerSnapshot(), before, "Writer operations must not alter the reader");
  passed++;
  // Account removal cascades without broad DELETE grants on child tables.
  sql("DELETE FROM public.auth_users WHERE id='" + fixtureId + "';", runtime);
  expectSql("SELECT count(*) FROM public.community_posts WHERE id='" + postId + "';", "0");
  expectSql("SELECT count(*) FROM public.auth_sessions WHERE user_id='" + fixtureId + "';", "0");
  expectSql("SELECT count(*) FROM public.community_images WHERE id='" + imageId + "';", "0");
  const again = sql(migration, "postgres", true);
  assert.notEqual(again.status, 0);
  assert.match(again.stderr, /already exists/i);
  passed++;
  console.log(JSON.stringify({ assertionsPassed: passed, schemaMigrations: migrations.length, isolated: true }));
} finally {
  if (started) docker(["rm", "-f", container], undefined, true);
}
