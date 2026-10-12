-- Expand the existing account PB allowlist without modifying current rows.
-- Run before releasing code that attempts the two new comparison-game writes.
-- Client-reported PBs MUST NOT be read as competitive leaderboard scores.
ALTER TABLE public.minigame_personal_bests
  DROP CONSTRAINT minigame_personal_bests_slot_valid,
  ADD CONSTRAINT minigame_personal_bests_slot_valid CHECK (
    (game_id = 'brawler-quiz' AND mode IN ('3m', '5m', '10m', 'practice'))
    OR (game_id = 'silhouette-quiz' AND mode = 'base')
    OR (game_id = 'map-quiz' AND mode = 'standard')
    OR (game_id = 'ability-quiz' AND mode IN ('mixed', 'gadget', 'star-power'))
    OR (game_id = 'higher-lower' AND mode = 'standard')
    OR (game_id = 'release-order' AND mode = 'standard')
  );
