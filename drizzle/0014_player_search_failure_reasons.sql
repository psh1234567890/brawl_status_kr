-- Extend the existing private hourly and lifetime counters with anonymous
-- HTTP-status categories for failed player lookups. Never store player tags,
-- IP addresses, account identifiers, raw exception messages or request URLs.
-- Apply before deploying code that emits these new categories.
ALTER TABLE analytics_private.usage_hourly
  DROP CONSTRAINT usage_hourly_event_kind_check,
  ADD CONSTRAINT usage_hourly_event_kind_check CHECK (event_kind IN (
    'visit_session', 'player_search_success', 'player_search_error',
    'player_search_error_404', 'player_search_error_429',
    'player_search_error_5xx', 'player_search_error_other',
    'minigame_brawler_quiz', 'minigame_silhouette_quiz',
    'minigame_map_quiz', 'minigame_ability_quiz'
  ));

ALTER TABLE analytics_private.usage_lifetime
  DROP CONSTRAINT usage_lifetime_event_kind_check,
  ADD CONSTRAINT usage_lifetime_event_kind_check CHECK (event_kind IN (
    'visit_session', 'player_search_success', 'player_search_error',
    'player_search_error_404', 'player_search_error_429',
    'player_search_error_5xx', 'player_search_error_other',
    'minigame_brawler_quiz', 'minigame_silhouette_quiz',
    'minigame_map_quiz', 'minigame_ability_quiz'
  ));
