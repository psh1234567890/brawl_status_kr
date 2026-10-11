-- Time-limited aggregate rows must expire even when there is no new traffic.
-- The durable anonymous usage_lifetime table deliberately remains unchanged.
SELECT cron.schedule(
  'brawl-usage-hourly-expire-daily',
  '35 2 * * *',
  $cron$
    DELETE FROM analytics_private.usage_hourly
     WHERE hour_bucket < date_trunc('hour', now()) - interval '90 days';
  $cron$
);
