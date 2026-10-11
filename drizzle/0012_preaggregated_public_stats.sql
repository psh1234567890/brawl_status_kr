-- Pre-compute the expensive public summaries inside a private schema.
-- Install before deploying code that reads these snapshots.
-- Refreshes are independent of site traffic and never expose user identities.
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_private.meta_brawler_snapshot AS
WITH source_totals AS (
  SELECT mode, map, brawler_name, max(brawler_id) AS brawler_id,
         count(*) AS plays,
         count(*) FILTER (WHERE result = 'victory') AS wins,
         count(*) FILTER (WHERE result = 'draw') AS draws
    FROM public.battle_team_participants
   WHERE battle_timestamp >= now() - interval '30 days'
     AND result IS NOT NULL AND brawler_name IS NOT NULL AND brawler_name <> 'Unknown'
   GROUP BY mode, map, brawler_name
  UNION ALL
  SELECT mode, map, brawler_name, max(brawler_id) AS brawler_id,
         count(*) AS plays,
         count(*) FILTER (WHERE result = 'victory') AS wins,
         count(*) FILTER (WHERE result = 'draw') AS draws
    FROM public.battle_logs
   WHERE meta_perspective_only = true
     AND battle_timestamp >= now() - interval '30 days'
     AND result IS NOT NULL AND brawler_name IS NOT NULL AND brawler_name <> 'Unknown'
   GROUP BY mode, map, brawler_name
)
SELECT mode, map, brawler_name, max(brawler_id) AS brawler_id,
       sum(plays) AS plays, sum(wins) AS wins, sum(draws) AS draws,
       now() AS refreshed_at
  FROM source_totals
 GROUP BY mode, map, brawler_name;

CREATE UNIQUE INDEX IF NOT EXISTS meta_brawler_snapshot_pk
    ON analytics_private.meta_brawler_snapshot (mode, map, brawler_name);

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_private.collection_status_snapshot AS
WITH map_totals AS MATERIALIZED (
  SELECT map AS name, count(*) AS plays FROM public.battle_logs GROUP BY map
), brawler_totals AS MATERIALIZED (
  SELECT brawler_name AS name, count(*) AS plays
    FROM public.battle_logs
   WHERE brawler_name <> 'Unknown'
   GROUP BY brawler_name
)
SELECT 1::int AS snapshot_id,
       (SELECT coalesce(sum(plays), 0) FROM map_totals) AS "totalBattles",
       (SELECT count(*) FROM (SELECT DISTINCT battle_fingerprint
          FROM public.battle_logs WHERE battle_fingerprint IS NOT NULL) f) AS "uniqueBattles",
       (SELECT count(*) FROM (SELECT DISTINCT player_tag
          FROM public.battle_logs WHERE player_tag IS NOT NULL) p) AS players,
       (SELECT count(*) FROM map_totals WHERE name IS NOT NULL) AS maps,
       (SELECT count(*) FROM brawler_totals WHERE name IS NOT NULL) AS brawlers,
       (SELECT max(battle_timestamp)::text FROM public.battle_logs) AS "latestBattle",
       coalesce((SELECT jsonb_agg(m ORDER BY plays DESC, name ASC)
         FROM (SELECT name, plays FROM map_totals
               ORDER BY plays DESC, name ASC LIMIT 10) m), '[]'::jsonb) AS "popularMaps",
       coalesce((SELECT jsonb_agg(b ORDER BY plays DESC, name ASC)
         FROM (SELECT name, plays FROM brawler_totals
               ORDER BY plays DESC, name ASC LIMIT 10) b), '[]'::jsonb) AS "popularBrawlers",
       now() AS refreshed_at;

CREATE UNIQUE INDEX IF NOT EXISTS collection_status_snapshot_pk
    ON analytics_private.collection_status_snapshot (snapshot_id);

REVOKE ALL ON analytics_private.meta_brawler_snapshot,
              analytics_private.collection_status_snapshot FROM PUBLIC, anon, authenticated;

-- Stagger refreshes to avoid competing scans. The unique indexes permit
-- CONCURRENTLY so readers retain the previous snapshot throughout refreshes.
SELECT cron.schedule('brawl-meta-snapshot-refresh', '*/15 * * * *',
  $cron$REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_private.meta_brawler_snapshot;$cron$);
SELECT cron.schedule('brawl-collection-snapshot-refresh', '7,22,37,52 * * * *',
  $cron$REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_private.collection_status_snapshot;$cron$);

COMMENT ON MATERIALIZED VIEW analytics_private.meta_brawler_snapshot IS
 '30-day public battle aggregates, refreshed every 15 minutes; never stores player IDs.';
COMMENT ON MATERIALIZED VIEW analytics_private.collection_status_snapshot IS
 'Snapshot of public battle totals and rankings; refreshed every 15 minutes.';
