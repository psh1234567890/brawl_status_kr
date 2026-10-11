-- Preserve anonymous cumulative usage counts even after hourly rows expire.
-- Never store IPs, cookies, tags, account identifiers or individual events.
-- Apply BEFORE deploying the dashboard API that reads usage_lifetime.
CREATE TABLE IF NOT EXISTS analytics_private.usage_lifetime (
  event_kind text PRIMARY KEY CHECK (event_kind IN (
    'visit_session', 'player_search_success', 'player_search_error',
    'minigame_brawler_quiz', 'minigame_silhouette_quiz',
    'minigame_map_quiz', 'minigame_ability_quiz'
  )),
  event_count bigint NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  first_seen_at timestamptz NOT NULL
);

ALTER TABLE analytics_private.usage_lifetime ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON analytics_private.usage_lifetime FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION analytics_private.increment_usage_lifetime()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  delta bigint;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.event_kind <> OLD.event_kind OR NEW.hour_bucket <> OLD.hour_bucket THEN
      RAISE EXCEPTION 'Cannot change anonymous usage bucket identity';
    END IF;
    delta := NEW.event_count - OLD.event_count;
  ELSE
    delta := NEW.event_count;
  END IF;

  IF delta > 0 THEN
    INSERT INTO analytics_private.usage_lifetime (event_kind, event_count, first_seen_at)
    VALUES (NEW.event_kind, delta, NEW.hour_bucket)
    ON CONFLICT (event_kind) DO UPDATE
      SET event_count = analytics_private.usage_lifetime.event_count + EXCLUDED.event_count,
          first_seen_at = LEAST(analytics_private.usage_lifetime.first_seen_at, EXCLUDED.first_seen_at);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION analytics_private.increment_usage_lifetime() FROM PUBLIC, anon, authenticated;

-- Existing hourly counts and concurrent live writes must not overlap the
-- initial backfill. This transactional lock prevents any missing/double counts.
LOCK TABLE analytics_private.usage_hourly IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO analytics_private.usage_lifetime (event_kind, event_count, first_seen_at)
SELECT event_kind, SUM(event_count), MIN(hour_bucket)
FROM analytics_private.usage_hourly
GROUP BY event_kind
ON CONFLICT (event_kind) DO NOTHING;

DROP TRIGGER IF EXISTS usage_lifetime_increment ON analytics_private.usage_hourly;
CREATE TRIGGER usage_lifetime_increment
AFTER INSERT OR UPDATE ON analytics_private.usage_hourly
FOR EACH ROW
EXECUTE FUNCTION analytics_private.increment_usage_lifetime();

COMMENT ON TABLE analytics_private.usage_lifetime IS
  'Lifetime anonymous event counts since instrumentation; survives 90-day hourly retention. No identifiers.';
