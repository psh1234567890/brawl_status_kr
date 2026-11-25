-- REVIEW ONLY: separate production writer role; never apply in a deployment.
-- The existing brawl_netlify_runtime preview reader is not modified.
-- Explicit operator approval and isolated rehearsal are required.
-- This creates a disabled, server-only role, without a password or LOGIN.
-- Activate LOGIN only after the local rehearsal and operator review.
-- It must never be assigned to anon, authenticated, authenticator or PUBLIC.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '25s';

-- Fail closed if the role exists; do not modify or reuse an unknown credential.
CREATE ROLE brawl_netlify_writer NOLOGIN NOINHERIT NOCREATEDB NOCREATEROLE;
GRANT USAGE ON SCHEMA public, analytics_private, account_safety TO brawl_netlify_writer;

DO $migration$
DECLARE
  spec record;
  actual_kind "char";
  actual_rls boolean;
  operation text;
  qualified text;
  role_name constant text := 'brawl_netlify_writer';
BEGIN
  FOR spec IN SELECT * FROM (VALUES
    -- Existing application authorization is enforced in the Next.js server.
    -- These policies permit that trusted server role only, not browser callers.
    ('public', 'auth_users',                  'r', true, 'SELECT,INSERT,UPDATE,DELETE'),
    ('public', 'auth_accounts',               'r', true, 'SELECT,INSERT,UPDATE,DELETE'),
    ('public', 'auth_sessions',               'r', true, 'SELECT,INSERT,UPDATE,DELETE'),
    ('public', 'auth_verifications',          'r', true, 'SELECT,INSERT,UPDATE,DELETE'),
    ('public', 'account_rate_limits',         'r', true, 'SELECT,INSERT,UPDATE,DELETE'),
    ('public', 'account_sync_receipts',       'r', true, 'SELECT,INSERT,DELETE'),
    ('public', 'account_deletion_tombstones', 'r', true, 'SELECT,INSERT,UPDATE,DELETE'),
    ('account_safety', 'deletion_ledger',     'r', true, 'SELECT,INSERT,UPDATE,DELETE'),
    ('public', 'minigame_personal_bests',     'r', true, 'SELECT,INSERT,UPDATE'),
    ('public', 'competitive_aliases',        'r', true, 'SELECT,INSERT,DELETE'),
    ('public', 'competitive_rounds',         'r', true, 'SELECT,INSERT,UPDATE,DELETE'),
    ('public', 'competitive_results',        'r', true, 'SELECT,INSERT,DELETE'),
    ('public', 'community_profiles',         'r', true, 'SELECT,INSERT,UPDATE'),
    ('public', 'community_posts',            'r', true, 'SELECT,INSERT,UPDATE'),
    ('public', 'community_comments',         'r', true, 'SELECT,INSERT,UPDATE'),
    ('public', 'community_moderation_log',   'r', true, 'INSERT'),
    ('public', 'community_images',           'r', true, 'SELECT,INSERT,UPDATE,DELETE'),
    ('public', 'community_image_objects',    'r', true, 'SELECT,INSERT,DELETE'),
    ('public', 'battle_logs',                'r', true, 'SELECT,INSERT'),
    ('public', 'battle_team_participants',   'r', true, 'SELECT,INSERT'),
    ('analytics_private', 'usage_hourly',             'r', false, 'SELECT,INSERT,UPDATE'),
    -- The invoker-security usage_hourly trigger also updates usage_lifetime.
    ('analytics_private', 'usage_lifetime',           'r', true, 'SELECT,INSERT,UPDATE'),
    ('analytics_private', 'search_tag_hourly',        'r', false, 'SELECT,INSERT,UPDATE'),
    ('analytics_private', 'search_tag_country_hourly','r', true, 'SELECT,INSERT,UPDATE'),
    ('analytics_private', 'api_performance_hourly',  'r', true, 'SELECT,INSERT,UPDATE'),
    ('analytics_private', 'usage_admin_allowlist',   'r', false, 'SELECT'),
    ('analytics_private', 'collection_status_snapshot','m', false, 'SELECT'),
    ('analytics_private', 'meta_brawler_quality_snapshot','m', false, 'SELECT')
  ) AS v(schema_name, relation_name, kind, rls, permissions)
  LOOP
    qualified := format('%I.%I', spec.schema_name, spec.relation_name);
    SELECT c.relkind, c.relrowsecurity INTO actual_kind, actual_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = spec.schema_name AND c.relname = spec.relation_name;
    IF NOT FOUND OR actual_kind::text IS DISTINCT FROM spec.kind
                 OR actual_rls IS DISTINCT FROM spec.rls THEN
      RAISE EXCEPTION 'Runtime role schema preflight failed for %', qualified;
    END IF;

    FOREACH operation IN ARRAY string_to_array(spec.permissions, ',') LOOP
      EXECUTE format('GRANT %s ON TABLE %s TO %I', operation, qualified, role_name);
      IF actual_rls THEN
        -- Per-command policies intentionally avoid widening future grants.
        CASE operation
          WHEN 'SELECT' THEN
            EXECUTE format('CREATE POLICY %I ON %s FOR SELECT TO %I USING (true)',
              'netlify_writer_select', qualified, role_name);
          WHEN 'INSERT' THEN
            EXECUTE format('CREATE POLICY %I ON %s FOR INSERT TO %I WITH CHECK (true)',
              'netlify_writer_insert', qualified, role_name);
          WHEN 'UPDATE' THEN
            EXECUTE format('CREATE POLICY %I ON %s FOR UPDATE TO %I USING (true) WITH CHECK (true)',
              'netlify_writer_update', qualified, role_name);
          WHEN 'DELETE' THEN
            IF qualified IN ('account_safety.deletion_ledger', 'public.account_deletion_tombstones') THEN
              EXECUTE format('CREATE POLICY %I ON %s FOR DELETE TO %I USING (expires_at <= now())',
                'netlify_writer_delete', qualified, role_name);
            ELSE
              EXECUTE format('CREATE POLICY %I ON %s FOR DELETE TO %I USING (true)',
                'netlify_writer_delete', qualified, role_name);
            END IF;
        END CASE;
      END IF;
    END LOOP;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname = role_name AND
      (rolcanlogin OR rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls OR rolreplication OR rolinherit)
  ) THEN
    RAISE EXCEPTION 'Runtime role has unexpected elevated attributes';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_namespace n
    WHERE n.nspname IN ('public','analytics_private','account_safety','auth','storage','cron')
      AND has_schema_privilege(role_name, n.oid, 'CREATE')
  ) THEN
    RAISE EXCEPTION 'Runtime role inherits unsafe schema CREATE permissions';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public', 'analytics_private', 'account_safety')
      AND c.relkind IN ('r','p','m','v')
      AND (has_table_privilege(role_name, c.oid, 'TRUNCATE')
        OR has_table_privilege(role_name, c.oid, 'TRIGGER')
        OR has_table_privilege(role_name, c.oid, 'REFERENCES')
        OR has_table_privilege(role_name, c.oid, 'SELECT WITH GRANT OPTION')
        OR has_table_privilege(role_name, c.oid, 'INSERT WITH GRANT OPTION')
        OR has_table_privilege(role_name, c.oid, 'UPDATE WITH GRANT OPTION')
        OR has_table_privilege(role_name, c.oid, 'DELETE WITH GRANT OPTION'))
  ) THEN
    RAISE EXCEPTION 'Runtime role inherits unsafe table privileges';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE (n.nspname, c.relname) IN (
      ('public','account_schema_migrations'),
      ('analytics_private','consented_search_details'),
      ('analytics_private','meta_brawler_snapshot')
    ) AND (has_table_privilege(role_name, c.oid, 'SELECT')
        OR has_table_privilege(role_name, c.oid, 'INSERT')
        OR has_table_privilege(role_name, c.oid, 'UPDATE')
        OR has_table_privilege(role_name, c.oid, 'DELETE'))
  ) THEN
    RAISE EXCEPTION 'Runtime role can access an excluded relation';
  END IF;
END
$migration$;

GRANT USAGE ON SEQUENCE public.battle_logs_id_seq, public.battle_team_participants_id_seq
  TO brawl_netlify_writer;
COMMIT;
