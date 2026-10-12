-- Country-only aggregate for successful public player-tag lookups.
-- Do not store IP, request/user/session identifiers, referrers or exact event times.
-- Existing search_tag_hourly totals and legacy rows remain unchanged.
CREATE TABLE IF NOT EXISTS analytics_private.search_tag_country_hourly (
  hour_bucket timestamptz NOT NULL,
  player_tag varchar(20) NOT NULL,
  country_code char(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  search_count bigint NOT NULL DEFAULT 0 CHECK (search_count >= 0),
  PRIMARY KEY (hour_bucket, player_tag, country_code)
);

REVOKE ALL ON analytics_private.search_tag_country_hourly FROM PUBLIC, anon, authenticated;
ALTER TABLE analytics_private.search_tag_country_hourly ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE analytics_private.search_tag_country_hourly IS
  'Seven-day hourly counts by public searched game tag and Vercel-estimated visitor country only; ZZ means unknown. No request identifiers.';

-- Reuse the existing job so both bounded counters have identical retention.
-- An already running invocation might use the previous command; owner reads
-- filter out older hourly buckets regardless.
SELECT cron.schedule(
  'brawl-search-tag-expire-hourly',
  '11 * * * *',
  $cron$
    DELETE FROM analytics_private.search_tag_hourly
    WHERE hour_bucket < date_trunc('hour', now() - interval '7 days');
    DELETE FROM analytics_private.search_tag_country_hourly
    WHERE hour_bucket < date_trunc('hour', now() - interval '7 days');
  $cron$
);
