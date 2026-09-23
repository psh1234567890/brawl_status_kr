ALTER TABLE battle_logs
  ADD COLUMN IF NOT EXISTS meta_perspective_only boolean;

CREATE INDEX IF NOT EXISTS battle_logs_meta_perspective_timestamp_idx
  ON battle_logs (meta_perspective_only, battle_timestamp);
