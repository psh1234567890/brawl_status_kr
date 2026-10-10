-- Anonymous aggregate counters only. No IP addresses, account IDs, player tags,
-- device fingerprints, request IDs or individual activity rows are retained.
CREATE SCHEMA IF NOT EXISTS analytics_private;
REVOKE ALL ON SCHEMA analytics_private FROM PUBLIC;
REVOKE ALL ON SCHEMA analytics_private FROM anon, authenticated;
CREATE TABLE IF NOT EXISTS analytics_private.usage_hourly (
  hour_bucket timestamptz NOT NULL,
  event_kind text NOT NULL CHECK (event_kind IN (
    'visit_session', 'player_search_success', 'player_search_error',
    'minigame_brawler_quiz', 'minigame_silhouette_quiz',
    'minigame_map_quiz', 'minigame_ability_quiz'
  )),
  event_count bigint NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  PRIMARY KEY (hour_bucket, event_kind)
);
REVOKE ALL ON ALL TABLES IN SCHEMA analytics_private FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE analytics_private.usage_hourly IS
  'Anonymous activity totals by UTC hour, without visitor or game identifiers. Pruned on event writes after 90 days.';
