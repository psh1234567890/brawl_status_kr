# Operational checklist: phase-2 performance and retention

## Migration order

1. Apply 0012_preaggregated_public_stats.sql before deploying the Next.js revision.
   It builds two private materialized views, creates unique indexes and schedules
   staggered concurrent refreshes every 15 minutes.
2. Compare the materialized views with the existing reference queries.
   Confirm that cron.job contains brawl-meta-snapshot-refresh and
   brawl-collection-snapshot-refresh. Inspect cron.job_run_details after a cycle.
3. Apply 0013_usage_retention_cron.sql before deploying code that removes
   per-write cleanup. It schedules 90-day anonymous-hourly retention daily.
   This does NOT expire the identifier-free usage_lifetime totals.
4. Deploy the application through the reviewed pull request and check:
   /api/health, /status, /api/meta, basic player lookup,
   privacy retention jobs, authenticated accounts and /minigames.

## Behaviour and limitations

- /api/meta and /status now read small pre-computed summaries from an
  unexposed analytics_private schema. Snapshots must be no older than 45
  minutes. The 15-minute UI cache can yield an older, correctly labelled
  response during a transient refresh error, but fabricated zero counts
  must not be returned.
- Only the public meta summary and collection status were pre-aggregated;
  counter, team and per-player history queries still use their current
  database execution strategies. Monitor the slowest routes for follow-ups.
- Several public GET endpoints now share the existing atomic rate-limit
  counter, using an HMAC of the trusted platform address. No raw IP is
  written to visitor analytics. When the counter database is unavailable,
  the independent process-local guard continues to operate.
- The official skin API provides equipped skins, NOT guaranteed exhaustive
  inventory. A disabled optional third-party provider must remain clearly
  disabled; success/stale cache and failure cooldowns are best-effort.
- Personal best previews on the mini game hub are loaded ONLY after a
  visitor clicks the button; the account API enforces session ownership.

## Rollback

Revert the application deployment first if reads from materialized views
fail, leaving the two private snapshots intact for investigation. Scheduled
refreshes can be disabled through reviewed cron job changes. Do not delete
existing source battle data, authentication records or lifetime counters
as part of the rollback.
