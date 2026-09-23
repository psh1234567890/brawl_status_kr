import { db } from "../db";
import { battleLogs, battleTeamParticipants } from "../db/schema";
import type { BattleLogItem } from "../types/brawl";
import {
  createBattleFingerprint,
  getNormalizedBattleResult,
  getPlayerBrawler,
  getPlayerTeamIndex,
  getPrimaryBrawler,
  isMetaPerspectiveOnly,
  parseBattleTime,
} from "../utils/brawlHelpers";
import { normalizePlayerTag } from "../utils/playerTag";

export async function saveBattleLogs(playerTag: string, items: BattleLogItem[]) {
  const validItems = items;
  if (validItems.length === 0) return;

  const values = validItems.map((match) => {
    const brawler = getPlayerBrawler(match, playerTag);
    return {
      playerTag,
      battleTime: match.battleTime,
      battleTimestamp: parseBattleTime(match.battleTime),
      battleFingerprint: createBattleFingerprint(match),
      playerTeamIndex: getPlayerTeamIndex(match, playerTag),
      metaPerspectiveOnly: isMetaPerspectiveOnly(match),
      mode: match.event.mode ?? "friendly",
      map: match.event.map ?? "친선 경기",
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

  const participantValues = validItems.flatMap((match) =>
    buildTeamParticipantValues(playerTag, match),
  );
  if (participantValues.length > 0) {
    await db.insert(battleTeamParticipants).values(participantValues).onConflictDoNothing();
  }
}

function buildTeamParticipantValues(playerTag: string, match: BattleLogItem) {
  const teams = match.battle.teams;
  const mode = match.event.mode ?? "friendly";
  const playerTeamIndex = getPlayerTeamIndex(match, playerTag);
  if (
    !teams ||
    playerTeamIndex === null ||
    isMetaPerspectiveOnly(match)
  ) {
    return [];
  }

  const battleFingerprint = createBattleFingerprint(match);
  const battleTimestamp = parseBattleTime(match.battleTime);
  const map = match.event.map ?? "친선 경기";
  const searchedResult = getNormalizedBattleResult(match);

  return teams.flatMap((team, index) => {
    const teamIndex = index + 1;
    const result =
      searchedResult === "draw"
        ? "draw"
        : teamIndex === playerTeamIndex
          ? searchedResult
          : searchedResult === "victory"
            ? "defeat"
            : "victory";

    return team.map((player) => {
      const brawler = getPrimaryBrawler(player);
      return {
        battleFingerprint,
        battleTimestamp,
        mode,
        map,
        teamIndex,
        playerTag: normalizePlayerTag(player.tag),
        brawlerId: brawler?.id ?? null,
        brawlerName: brawler?.name ?? "Unknown",
        result,
      };
    });
  });
}
