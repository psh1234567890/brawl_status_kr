-- REVIEW-ONLY. This script must never execute in a deployment build.
-- After separate operator approval, restrict the already-connected
-- brawl_netlify_runtime account to SELECT-only on application relations.
-- Keep the separate future production writer role out of this migration.
--
-- All changes are atomic. Any failed postcondition rolls the transaction back.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '25s';

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'brawl_netlify_runtime'
      AND rolcanlogin
      AND NOT rolsuper
      AND NOT rolbypassrls
      AND NOT rolinherit
      AND rolconfig @> ARRAY['default_transaction_read_only=on']::text[]
  ) THEN
    RAISE EXCEPTION 'Unexpected Netlify runtime role; aborting read-only hardening';
  END IF;

  IF NOT (
    to_regnamespace('public') IS NOT NULL
    AND to_regnamespace('analytics_private') IS NOT NULL
    AND to_regnamespace('account_safety') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Expected application schemas are missing';
  END IF;
END
$preflight$;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public, analytics_private, account_safety
  FROM brawl_netlify_runtime;

REVOKE ALL PRIVILEGES
  ON ALL SEQUENCES IN SCHEMA public, analytics_private, account_safety
  FROM brawl_netlify_runtime;

DO $postflight$
DECLARE
  target_role CONSTANT text := 'brawl_netlify_runtime';
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'analytics_private', 'account_safety')
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND (
        has_table_privilege(target_role, c.oid, 'INSERT')
        OR has_table_privilege(target_role, c.oid, 'UPDATE')
        OR has_table_privilege(target_role, c.oid, 'DELETE')
        OR has_table_privilege(target_role, c.oid, 'TRUNCATE')
        OR has_table_privilege(target_role, c.oid, 'REFERENCES')
        OR has_table_privilege(target_role, c.oid, 'TRIGGER')
      )
  ) THEN
    RAISE EXCEPTION 'Effective table write privilege remains; rolling back';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'analytics_private', 'account_safety')
      AND c.relkind = 'S'
      AND (
        has_sequence_privilege(target_role, c.oid, 'USAGE')
        OR has_sequence_privilege(target_role, c.oid, 'UPDATE')
        OR has_sequence_privilege(target_role, c.oid, 'SELECT')
      )
  ) THEN
    RAISE EXCEPTION 'Effective sequence privilege remains; rolling back';
  END IF;
END
$postflight$;

COMMIT;
