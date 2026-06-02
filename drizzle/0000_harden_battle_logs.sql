ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS battle_timestamp timestamptz;
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS battle_fingerprint text;
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS brawler_id integer;
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS battle_detail_json jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS battle_logs_player_time_unique
  ON battle_logs (player_tag, battle_time);
CREATE UNIQUE INDEX IF NOT EXISTS battle_logs_player_fingerprint_unique
  ON battle_logs (player_tag, battle_fingerprint);
CREATE INDEX IF NOT EXISTS battle_logs_player_tag_idx
  ON battle_logs (player_tag);
CREATE INDEX IF NOT EXISTS battle_logs_map_brawler_idx
  ON battle_logs (map, brawler_name);
CREATE INDEX IF NOT EXISTS battle_logs_battle_timestamp_idx
  ON battle_logs (battle_timestamp);

