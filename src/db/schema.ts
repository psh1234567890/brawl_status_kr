import { pgTable, serial, text, integer, unique } from "drizzle-orm/pg-core";

export const battleLogs = pgTable(
  "battle_logs",
  {
    id: serial("id").primaryKey(),
    playerTag: text("player_tag").notNull(),
    battleTime: text("battle_time").notNull(),
    mode: text("mode").notNull(),
    map: text("map").notNull(),
    brawlerName: text("brawler_name").notNull(),
    result: text("result"),
    rank: integer("rank"),
    trophyChange: integer("trophy_change"),
    battleDetail: text("battle_detail").notNull(),
  },
  (table) => {
    return {
      // 플레이어 태그와 전투 시간의 조합이 일치하면 중복 데이터로 판단하여 차단
      playerBattleUnique: unique().on(table.playerTag, table.battleTime),
    };
  },
);
