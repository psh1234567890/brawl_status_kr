import { db } from "../db";
import { battleLogs } from "../db/schema";
import type { BattleLogItem } from "../types/brawl";
import {
  createBattleFingerprint,
  getNormalizedBattleResult,
  getPlayerBrawler,
  parseBattleTime,
} from "../utils/brawlHelpers";

export async function saveBattleLogs(playerTag: string, items: BattleLogItem[]) {
  if (items.length === 0) return;

  const values = items.map((match) => {
    const brawler = getPlayerBrawler(match, playerTag);
    return {
      playerTag,
      battleTime: match.battleTime,
      battleTimestamp: parseBattleTime(match.battleTime),
      battleFingerprint: createBattleFingerprint(match),
      mode: match.event.mode,
      map: match.event.map,
      brawlerId: brawler?.id,
      brawlerName: brawler?.name ?? "Unknown",
      result: getNormalizedBattleResult(match),
      rank: match.battle.rank,
      trophyChange: match.battle.trophyChange,
      battleDetail: JSON.stringify(match),
      battleDetailJson: match,
    };
  });

  await db.insert(battleLogs).values(values).onConflictDoNothing();
}
