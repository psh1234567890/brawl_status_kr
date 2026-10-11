-- Enforce the seven-day retention period even when no visitor performs a search.
-- Supabase Cron (pg_cron) is used so no public, unauthenticated cleanup URL
-- or externally managed secret is needed.
--
-- Migration is intentionally scoped to analytics_private.consented_search_details.
-- It does not delete or alter battle logs, user accounts or anonymous counters.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Hourly at minute 7, using the database scheduler time zone (UTC on Supabase).
-- cron.schedule with a stable job name updates an existing named job instead of
-- creating duplicates on a reviewed repeat deployment.
SELECT cron.schedule(
  'brawl-consented-search-details-expire-hourly',
  '7 * * * *',
  $cron$
    DELETE FROM analytics_private.consented_search_details
    WHERE searched_at < now() - interval '7 days';
  $cron$
);
