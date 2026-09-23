CREATE TABLE IF NOT EXISTS battle_team_participants (
  id serial PRIMARY KEY,
  battle_fingerprint text NOT NULL,
  battle_timestamp timestamptz,
  mode text NOT NULL,
  map text NOT NULL,
  team_index integer NOT NULL,
  player_tag text NOT NULL,
  brawler_id integer,
  brawler_name text NOT NULL,
  result text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS battle_team_participants_battle_team_player_unique
  ON battle_team_participants (battle_fingerprint, team_index, player_tag);

CREATE INDEX IF NOT EXISTS battle_team_participants_timestamp_idx
  ON battle_team_participants (battle_timestamp);

CREATE INDEX IF NOT EXISTS battle_team_participants_map_timestamp_idx
  ON battle_team_participants (map, battle_timestamp);

CREATE INDEX IF NOT EXISTS battle_team_participants_brawler_timestamp_idx
  ON battle_team_participants (brawler_name, battle_timestamp);

CREATE INDEX IF NOT EXISTS battle_team_participants_fingerprint_idx
  ON battle_team_participants (battle_fingerprint);

ALTER TABLE battle_team_participants ENABLE ROW LEVEL SECURITY;
