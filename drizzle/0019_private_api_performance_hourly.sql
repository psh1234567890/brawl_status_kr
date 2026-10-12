-- Hourly aggregate operational health only: no IPs, users, tags, cookies,
-- request IDs, timestamps for individual requests, or raw HTTP paths.
CREATE TABLE IF NOT EXISTS analytics_private.api_performance_hourly (
  hour_bucket timestamptz NOT NULL,
  route_key text NOT NULL CHECK (route_key IN (
    'api.player', 'api.player.matches.read', 'api.player.matches.save',
    'api.player.skins', 'api.meta', 'api.meta.counters', 'api.meta.teams'
  )),
  request_count bigint NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  total_duration_ms numeric NOT NULL DEFAULT 0 CHECK (total_duration_ms >= 0),
  ok_count bigint NOT NULL DEFAULT 0 CHECK (ok_count >= 0),
  not_found_count bigint NOT NULL DEFAULT 0 CHECK (not_found_count >= 0),
  rate_limited_count bigint NOT NULL DEFAULT 0 CHECK (rate_limited_count >= 0),
  other_4xx_count bigint NOT NULL DEFAULT 0 CHECK (other_4xx_count >= 0),
  server_error_count bigint NOT NULL DEFAULT 0 CHECK (server_error_count >= 0),
  le_250ms bigint NOT NULL DEFAULT 0 CHECK (le_250ms >= 0),
  le_500ms bigint NOT NULL DEFAULT 0 CHECK (le_500ms >= 0),
  le_1000ms bigint NOT NULL DEFAULT 0 CHECK (le_1000ms >= 0),
  le_2000ms bigint NOT NULL DEFAULT 0 CHECK (le_2000ms >= 0),
  le_5000ms bigint NOT NULL DEFAULT 0 CHECK (le_5000ms >= 0),
  le_10000ms bigint NOT NULL DEFAULT 0 CHECK (le_10000ms >= 0),
  over_10000ms bigint NOT NULL DEFAULT 0 CHECK (over_10000ms >= 0),
  PRIMARY KEY (hour_bucket, route_key)
);
REVOKE ALL ON analytics_private.api_performance_hourly FROM PUBLIC, anon, authenticated;
ALTER TABLE analytics_private.api_performance_hourly ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE analytics_private.api_performance_hourly IS
  'Private per-hour per-static-route latency histograms and HTTP status counters. 30-day retention; no per-request/user identifiers.';

SELECT cron.schedule(
  'brawl-api-performance-expire-daily', '43 2 * * *',
  $cron$
    DELETE FROM analytics_private.api_performance_hourly
    WHERE hour_bucket < date_trunc('hour', now() - interval '30 days');
  $cron$
);
