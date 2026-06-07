export type BattleOutcome = "victory" | "defeat" | "draw";

export interface BrawlAbility {
  id: number;
  name: string;
}

export interface BrawlGear {
  id: number;
  name: string;
}

export interface BrawlerSkin {
  id: number;
  name: string;
}

export interface Brawler {
  id: number;
  name: string;
  power: number;
  trophies: number;
  highestTrophies: number;
  gadgets?: BrawlAbility[];
  starPowers?: BrawlAbility[];
  hyperCharges?: BrawlAbility[];
  gears?: BrawlGear[];
  skin?: BrawlerSkin;
  skins?: BrawlerSkin[];
  buffies?: {
    gadget?: boolean;
    starPower?: boolean;
    hyperCharge?: boolean;
  };
}

export interface BattleBrawler {
  id?: number;
  name?: string;
  trophies?: number;
}

export interface BattlePlayer {
  tag: string;
  name?: string;
  brawler?: BattleBrawler;
  brawlers?: BattleBrawler[];
}

export interface BattleLogItem {
  battleTime: string;
  event: {
    mode?: string;
    map?: string;
  };
  battle: {
    result?: string;
    rank?: number;
    trophyChange?: number;
    duration?: number;
    type?: string;
    teams?: BattlePlayer[][];
    players?: BattlePlayer[];
    starPlayer?: BattlePlayer;
  };
}

export interface BattleLogResponse {
  items: BattleLogItem[];
}

export interface PlayerData {
  tag: string;
  name: string;
  nameColor?: string;
  icon?: { id: number };
  club?: { tag?: string; name: string };
  trophies: number;
  highestTrophies: number;
  expLevel: number;
  "3vs3Victories": number;
  soloVictories: number;
  duoVictories: number;
  highestAllTimeRankedRankName?: string;
  highestAllTimeRankedElo?: number;
  rankedRankName?: string;
  rankedElo?: number;
  bestRoboRumbleTime?: number;
  bestTimeAsBigBrawler?: number;
  isQualifiedFromChampionshipChallenge?: boolean;
  brawlers: Brawler[];
}

export interface BrawlerStat {
  name: string;
  plays: number;
  wins: number;
  winRate: number;
}

export interface PlayerDbStats {
  totalGames: number;
  brawlers: BrawlerStat[];
}

export interface RecentBattleSummary {
  wins: number;
  defeats: number;
  draws: number;
  total: number;
  winRate: number;
  bestMode: string;
  maxModeWins: number;
  streakCount: number;
}
