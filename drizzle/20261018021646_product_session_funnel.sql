-- Fixed anonymous aggregate kinds only; no new identity or per-visit tables.
-- Apply before deploying the new client. Existing app versions remain compatible.
SET lock_timeout = '5s';
SET statement_timeout = '15s';
ALTER TABLE analytics_private.usage_hourly
  DROP CONSTRAINT usage_hourly_event_kind_check,
  ADD CONSTRAINT usage_hourly_event_kind_check CHECK (event_kind IN (
    'visit_session', 'player_search_success', 'player_search_error',
    'player_search_error_404', 'player_search_error_429', 'player_search_error_5xx', 'player_search_error_other',
    'minigame_brawler_quiz', 'minigame_silhouette_quiz', 'minigame_map_quiz', 'minigame_ability_quiz',
    'page_view', 'browser_session', 'browser_return_7d',
    'profile_save', 'profile_unsave', 'profile_compare', 'comparison_run', 'profile_share', 'profile_reopen',
    'funnel_session', 'funnel_active', 'funnel_search', 'funnel_followup',
    'funnel_after_meta', 'funnel_after_compare', 'funnel_after_game', 'funnel_after_save', 'funnel_after_share',
    'minigame_higher_lower', 'minigame_release_order'
  ));
ALTER TABLE analytics_private.usage_lifetime
  DROP CONSTRAINT usage_lifetime_event_kind_check,
  ADD CONSTRAINT usage_lifetime_event_kind_check CHECK (event_kind IN (
    'visit_session', 'player_search_success', 'player_search_error',
    'player_search_error_404', 'player_search_error_429', 'player_search_error_5xx', 'player_search_error_other',
    'minigame_brawler_quiz', 'minigame_silhouette_quiz', 'minigame_map_quiz', 'minigame_ability_quiz',
    'page_view', 'browser_session', 'browser_return_7d',
    'profile_save', 'profile_unsave', 'profile_compare', 'comparison_run', 'profile_share', 'profile_reopen',
    'funnel_session', 'funnel_active', 'funnel_search', 'funnel_followup',
    'funnel_after_meta', 'funnel_after_compare', 'funnel_after_game', 'funnel_after_save', 'funnel_after_share',
    'minigame_higher_lower', 'minigame_release_order'
  ));
RESET statement_timeout;
RESET lock_timeout;
