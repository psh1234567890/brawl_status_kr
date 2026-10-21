-- Additive: the original snapshot and refresh job remain usable by rollbacks.
-- Install before deploying readers. All fields in a row share one refresh time.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '10s';

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_private.meta_brawler_quality_snapshot AS
WITH source_totals AS (
  SELECT mode, map, brawler_name, max(brawler_id) AS brawler_id,
         count(*) AS plays,
         count(*) FILTER (WHERE result = 'victory') AS wins,
         count(*) FILTER (WHERE result = 'draw') AS draws,
         count(*) FILTER (WHERE battle_timestamp >= now() - interval '7 days') AS recent_plays,
         max(battle_timestamp) AS last_battle_at
    FROM public.battle_team_participants
   WHERE battle_timestamp >= now() - interval '30 days' AND battle_timestamp <= now()
     AND result IS NOT NULL AND brawler_name IS NOT NULL AND brawler_name <> 'Unknown'
   GROUP BY mode, map, brawler_name
  UNION ALL
  SELECT mode, map, brawler_name, max(brawler_id) AS brawler_id,
         count(*) AS plays,
         count(*) FILTER (WHERE result = 'victory') AS wins,
         count(*) FILTER (WHERE result = 'draw') AS draws,
         count(*) FILTER (WHERE battle_timestamp >= now() - interval '7 days') AS recent_plays,
         max(battle_timestamp) AS last_battle_at
    FROM public.battle_logs
   WHERE meta_perspective_only = true
     AND battle_timestamp >= now() - interval '30 days' AND battle_timestamp <= now()
     AND result IS NOT NULL AND brawler_name IS NOT NULL AND brawler_name <> 'Unknown'
   GROUP BY mode, map, brawler_name
)
SELECT mode, map, brawler_name, max(brawler_id) AS brawler_id,
       sum(plays) AS plays, sum(wins) AS wins, sum(draws) AS draws,
       sum(recent_plays) AS recent_plays, max(last_battle_at) AS last_battle_at,
       now() AS refreshed_at
  FROM source_totals
 GROUP BY mode, map, brawler_name;

CREATE UNIQUE INDEX IF NOT EXISTS meta_brawler_quality_snapshot_pk
    ON analytics_private.meta_brawler_quality_snapshot (mode, map, brawler_name);
REVOKE ALL ON analytics_private.meta_brawler_quality_snapshot FROM PUBLIC, anon, authenticated;
COMMENT ON MATERIALIZED VIEW analytics_private.meta_brawler_quality_snapshot IS
 '30-day aggregates with 7-day sample counts and last observed match time; no player IDs. Ranking remains legacy-v1.';

-- SCHEDULE: stagger scans away from the existing snapshots; one refresh/15 min.
SELECT cron.schedule('brawl-meta-quality-snapshot-refresh', '3,18,33,48 * * * *',
  $cron$REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_private.meta_brawler_quality_snapshot;$cron$);
