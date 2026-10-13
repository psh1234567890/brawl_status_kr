-- Expand existing anonymous counters without retaining individual visitors.
-- Apply to both tables before the application emits these events.
SET lock_timeout = '5s';
ALTER TABLE analytics_private.usage_hourly
  DROP CONSTRAINT usage_hourly_event_kind_check,
  ADD CONSTRAINT usage_hourly_event_kind_check CHECK (event_kind IN (
    'visit_session', 'player_search_success', 'player_search_error',
    'player_search_error_404', 'player_search_error_429',
    'player_search_error_5xx', 'player_search_error_other',
    'minigame_brawler_quiz', 'minigame_silhouette_quiz',
    'minigame_map_quiz', 'minigame_ability_quiz',
    'page_view', 'browser_session', 'browser_return_7d',
    'profile_save', 'profile_unsave', 'profile_compare', 'comparison_run',
    'profile_share', 'profile_reopen'
  ));
ALTER TABLE analytics_private.usage_lifetime
  DROP CONSTRAINT usage_lifetime_event_kind_check,
  ADD CONSTRAINT usage_lifetime_event_kind_check CHECK (event_kind IN (
    'visit_session', 'player_search_success', 'player_search_error',
    'player_search_error_404', 'player_search_error_429',
    'player_search_error_5xx', 'player_search_error_other',
    'minigame_brawler_quiz', 'minigame_silhouette_quiz',
    'minigame_map_quiz', 'minigame_ability_quiz',
    'page_view', 'browser_session', 'browser_return_7d',
    'profile_save', 'profile_unsave', 'profile_compare', 'comparison_run',
    'profile_share', 'profile_reopen'
  ));
RESET lock_timeout;
