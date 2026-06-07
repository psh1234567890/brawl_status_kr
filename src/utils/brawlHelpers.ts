import type {
  BattleBrawler,
  BattleLogItem,
  BattleLogResponse,
  BattleOutcome,
  BattlePlayer,
  PlayerData,
  RecentBattleSummary,
} from "../types/brawl";
import { normalizePlayerTag } from "./playerTag";

const SHOWDOWN_WIN_RANK: Record<string, number> = {
  soloShowdown: 4,
  duoShowdown: 2,
  trioShowdown: 2,
};

export function checkIsRanked(match: BattleLogItem) {
  return match.battle.type === "soloRanked" || match.battle.type === "teamRanked";
}

export function checkIsFriendly(match: BattleLogItem) {
  return match.battle.type === "friendly";
}

export function getNormalizedBattleResult(match: BattleLogItem): BattleOutcome {
  const mode = match.event.mode ?? "";
  const showdownWinRank = SHOWDOWN_WIN_RANK[mode];
  if (showdownWinRank !== undefined && match.battle.rank !== undefined) {
    return match.battle.rank <= showdownWinRank ? "victory" : "defeat";
  }

  if (match.battle.result === "victory" || match.battle.result === "defeat") {
    return match.battle.result;
  }

  return "draw";
}

export function getBattleResultInfo(match: BattleLogItem) {
  const outcome = getNormalizedBattleResult(match);

  if (outcome === "victory") {
    return {
      resultText: "승리",
      resultColor: "text-blue-500",
      bgColor: "bg-white border-blue-500",
      isWin: true,
      isLoss: false,
      isDraw: false,
    };
  }

  if (outcome === "defeat") {
    return {
      resultText: "패배",
      resultColor: "text-red-500",
      bgColor: "bg-white border-red-500",
      isWin: false,
      isLoss: true,
      isDraw: false,
    };
  }

  return {
    resultText: "무승부",
    resultColor: "text-gray-500",
    bgColor: "bg-white border-gray-400",
    isWin: false,
    isLoss: false,
    isDraw: true,
  };
}

export function getBattlePlayers(match: BattleLogItem): BattlePlayer[] {
  return [
    ...(match.battle.players ?? []),
    ...(match.battle.teams ?? []).flat(),
  ];
}

export function getPrimaryBrawler(player: BattlePlayer): BattleBrawler | undefined {
  return player.brawler ?? player.brawlers?.[0];
}

export function getPlayerBrawler(match: BattleLogItem, playerTag: string) {
  const cleanTag = normalizePlayerTag(playerTag);
  const player = getBattlePlayers(match).find(
    (candidate) => normalizePlayerTag(candidate.tag) === cleanTag,
  );
  return player ? getPrimaryBrawler(player) : undefined;
}

export function createBattleFingerprint(match: BattleLogItem) {
  const participantTags = getBattlePlayers(match)
    .map((player) => normalizePlayerTag(player.tag))
    .filter(Boolean)
    .sort()
    .join(",");

  return [
    match.battleTime,
    match.event.mode ?? "friendly",
    match.event.map ?? "친선 경기",
    participantTags || "unknown-participants",
  ].join("|");
}

export function parseBattleTime(battleTime: string) {
  const matched = battleTime.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.(\d+))?Z$/,
  );
  if (!matched) return null;

  const [, year, month, day, hour, minute, second, fraction = "0"] = matched;
  const milliseconds = Number(fraction.padEnd(3, "0").slice(0, 3));
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      milliseconds,
    ),
  );
}

export function calculateRecentBattleSummary(
  battleLog: BattleLogResponse | null,
): RecentBattleSummary {
  const modeWins: Record<string, number> = {};
  const uniqueDates: string[] = [];
  let wins = 0;
  let defeats = 0;
  let draws = 0;
  let bestMode = "데이터 부족";
  let maxModeWins = 0;

  for (const match of battleLog?.items ?? []) {
    if (checkIsFriendly(match)) continue;

    if (match.battleTime) {
      const date = match.battleTime.slice(0, 8);
      if (!uniqueDates.includes(date)) uniqueDates.push(date);
    }

    const result = getNormalizedBattleResult(match);
    if (result === "victory") {
      wins += 1;
      const modeKey = match.event.mode ?? "friendly";
      modeWins[modeKey] = (modeWins[modeKey] ?? 0) + 1;
      if (modeWins[modeKey] > maxModeWins) {
        maxModeWins = modeWins[modeKey];
        bestMode = modeKey;
      }
    } else if (result === "defeat") {
      defeats += 1;
    } else {
      draws += 1;
    }
  }

  let streakCount = uniqueDates.length > 0 ? 1 : 0;
  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previous = uniqueDates[index - 1];
    const current = uniqueDates[index];
    const previousTime = Date.UTC(
      Number(previous.slice(0, 4)),
      Number(previous.slice(4, 6)) - 1,
      Number(previous.slice(6, 8)),
    );
    const currentTime = Date.UTC(
      Number(current.slice(0, 4)),
      Number(current.slice(4, 6)) - 1,
      Number(current.slice(6, 8)),
    );
    if ((previousTime - currentTime) / 86_400_000 !== 1) break;
    streakCount += 1;
  }

  const total = wins + defeats + draws;
  return {
    wins,
    defeats,
    draws,
    total,
    winRate: total > 0 ? Math.floor((wins / total) * 100) : 0,
    bestMode,
    maxModeWins,
    streakCount,
  };
}

export function calculateBrawlerStats(
  battleLog: BattleLogResponse | null,
  playerTag: string,
  brawlerName: string,
) {
  const modes: Record<string, number> = {};
  let plays = 0;
  let wins = 0;
  let topMode = "없음";
  let maxMode = 0;

  for (const match of battleLog?.items ?? []) {
    if (checkIsFriendly(match)) continue;
    if (getPlayerBrawler(match, playerTag)?.name !== brawlerName) continue;

    plays += 1;
    if (getNormalizedBattleResult(match) === "victory") wins += 1;
    const modeKey = match.event.mode ?? "friendly";
    modes[modeKey] = (modes[modeKey] ?? 0) + 1;
    if (modes[modeKey] > maxMode) {
      maxMode = modes[modeKey];
      topMode = modeKey;
    }
  }

  return {
    plays,
    wins,
    winRate: plays > 0 ? Math.floor((wins / plays) * 100) : 0,
    topMode,
  };
}

export function estimatePlayTime(player: PlayerData) {
  const totalVictories =
    player["3vs3Victories"] + player.soloVictories + player.duoVictories;
  const matchesByWinRate = Math.floor(totalVictories / 0.42);
  const matchesByExp = player.expLevel * 35;
  const totalMinutes = Math.floor((matchesByWinRate + matchesByExp) / 2) * 3.8;

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: Math.floor(totalMinutes % 60),
  };
}
