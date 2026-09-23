import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const battleLogs = pgTable(
  "battle_logs",
  {
    id: serial("id").primaryKey(),
    playerTag: text("player_tag").notNull(),
    battleTime: text("battle_time").notNull(),
    battleTimestamp: timestamp("battle_timestamp", { withTimezone: true }),
    battleFingerprint: text("battle_fingerprint"),
    playerTeamIndex: integer("player_team_index"),
    mode: text("mode").notNull(),
    map: text("map").notNull(),
    brawlerId: integer("brawler_id"),
    brawlerName: text("brawler_name").notNull(),
    result: text("result"),
    rank: integer("rank"),
    trophyChange: integer("trophy_change"),
    battleDetail: text("battle_detail").notNull(),
    battleDetailJson: jsonb("battle_detail_json"),
  },
  (table) => [
    unique("battle_logs_player_time_unique").on(table.playerTag, table.battleTime),
    unique("battle_logs_player_fingerprint_unique").on(
      table.playerTag,
      table.battleFingerprint,
    ),
    index("battle_logs_player_tag_idx").on(table.playerTag),
    index("battle_logs_battle_fingerprint_idx").on(table.battleFingerprint),
    index("battle_logs_battle_detail_json_gin_idx").using("gin", table.battleDetailJson),
    index("battle_logs_map_brawler_idx").on(table.map, table.brawlerName),
    index("battle_logs_battle_timestamp_idx").on(table.battleTimestamp),
  ],
);

export const battleTeamParticipants = pgTable(
  "battle_team_participants",
  {
    id: serial("id").primaryKey(),
    battleFingerprint: text("battle_fingerprint").notNull(),
    battleTimestamp: timestamp("battle_timestamp", { withTimezone: true }),
    mode: text("mode").notNull(),
    map: text("map").notNull(),
    teamIndex: integer("team_index").notNull(),
    playerTag: text("player_tag").notNull(),
    brawlerId: integer("brawler_id"),
    brawlerName: text("brawler_name").notNull(),
    result: text("result").notNull(),
  },
  (table) => [
    uniqueIndex("battle_team_participants_battle_team_player_unique").on(
      table.battleFingerprint,
      table.teamIndex,
      table.playerTag,
    ),
    index("battle_team_participants_timestamp_idx").on(table.battleTimestamp),
    index("battle_team_participants_map_timestamp_idx").on(
      table.map,
      table.battleTimestamp,
    ),
    index("battle_team_participants_brawler_timestamp_idx").on(
      table.brawlerName,
      table.battleTimestamp,
    ),
    index("battle_team_participants_fingerprint_idx").on(table.battleFingerprint),
  ],
);
