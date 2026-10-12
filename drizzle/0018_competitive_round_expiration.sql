-- Supabase pg_cron extension is not installed in disposable vanilla PostgreSQL.
-- Apply separately in production after 0017_verified_comparison_rankings.sql.
SELECT cron.schedule(
  'brawl-competitive-expire-rounds',
  '17 * * * *',
  $cron$
    DELETE FROM public.competitive_rounds WHERE expires_at < now();
  $cron$
);
