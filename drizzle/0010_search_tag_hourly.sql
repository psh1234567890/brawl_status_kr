-- Anonymous operational statistics: only public searched game tags and hourly counts.
-- No requester IP, account, session, cookie, User-Agent or identifier.
CREATE TABLE IF NOT EXISTS analytics_private.search_tag_hourly (
  hour_bucket timestamptz NOT NULL,
  player_tag varchar(20) NOT NULL,
  search_count bigint NOT NULL DEFAULT 0 CHECK (search_count >= 0),
  last_searched_at timestamptz NOT NULL,
  PRIMARY KEY (hour_bucket, player_tag)
);
REVOKE ALL ON analytics_private.search_tag_hourly FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE analytics_private.search_tag_hourly IS
  'Only game tags searched and hour-level totals, for private operator diagnostics. No requester identity.';
-- Expires hourly buckets after a seven-day window; privacy notice explains
-- the expiry process may occur at the next hourly scheduled run.
SELECT cron.schedule(
  'brawl-search-tag-expire-hourly',
  '11 * * * *',
  $cron$
    DELETE FROM analytics_private.search_tag_hourly
    WHERE hour_bucket < date_trunc('hour', now() - interval '7 days');
  $cron$
);
