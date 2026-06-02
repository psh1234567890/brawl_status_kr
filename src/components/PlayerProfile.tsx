import { rankDict } from "../constants/brawl";
import type { PlayerData } from "../types/brawl";
import BrawlImage from "./BrawlImage";

interface PlayerProfileProps {
  playerData: PlayerData;
  nameColor: string;
  streakCount: number;
  playTime: { hours: number; minutes: number };
}

export default function PlayerProfile({
  playerData,
  nameColor,
  streakCount,
  playTime,
}: PlayerProfileProps) {
  return (
    <section className="mb-10 w-full rounded-3xl border border-white bg-white/80 p-10 text-black shadow-2xl backdrop-blur-md transition-transform hover:-translate-y-1">
      <div className="mb-8 flex flex-col items-center border-b-2 border-gray-100 pb-8">
        <div className="mb-2 flex items-center gap-4">
          {playerData.icon ? (
            <BrawlImage
              src={`https://cdn.brawlify.com/profile/${playerData.icon.id}.png`}
              alt="프로필 아이콘"
              width={64}
              height={64}
              className="h-16 w-16 rounded-full border-2 border-indigo-200 shadow-md"
            />
          ) : null}
          <h2 className="text-5xl font-black drop-shadow-sm" style={{ color: nameColor }}>
            {playerData.name}
          </h2>
        </div>
        {streakCount > 0 ? (
          <div className="mt-4 rounded-full border border-orange-300 bg-orange-100 px-6 py-2 shadow-sm">
            <span className="text-lg font-black text-orange-600">
              최근 {streakCount}일 연속 플레이 중
            </span>
          </div>
        ) : null}
        <div className={`mt-4 rounded-full px-6 py-2 shadow-md ${playerData.club ? "bg-indigo-600" : "bg-gray-200"}`}>
          <span className={`text-lg font-bold ${playerData.club ? "text-white" : "text-gray-600"}`}>
            {playerData.club ? `소속 클럽: ${playerData.club.name}` : "소속 클럽 없음"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 text-lg font-medium md:grid-cols-2">
        <Stat label="현재 트로피" value={playerData.trophies} color="yellow" />
        <Stat label="최고 트로피" value={playerData.highestTrophies} color="gray" />
        <Stat label="예상 플레이 타임" value={`약 ${playTime.hours}시간 ${playTime.minutes}분`} color="purple" wide />
        <Stat label="경험치 레벨" value={playerData.expLevel} />
        <Stat label="3v3 승리" value={playerData["3vs3Victories"]} />
        <Stat label="솔로 쇼다운 승리" value={playerData.soloVictories} color="blue" />
        <Stat label="듀오 쇼다운 승리" value={playerData.duoVictories} color="green" />
        <Stat label="역대 최고 경쟁전 랭크" value={formatRank(playerData.highestAllTimeRankedRankName, playerData.highestAllTimeRankedElo)} color="pink" />
        <Stat label="현재 경쟁전 랭크" value={formatRank(playerData.rankedRankName, playerData.rankedElo)} color="pink" />
        <Stat label="로보 럼블 최고 기록" value={playerData.bestRoboRumbleTime ?? "-"} color="indigo" />
        <Stat label="빅 브롤러 최고 기록" value={playerData.bestTimeAsBigBrawler ?? "-"} color="teal" />
        <Stat label="챔피언십 챌린지 예선" value={playerData.isQualifiedFromChampionshipChallenge ? "통과" : "미통과(가장 최근)"} color="orange" wide />
      </div>
    </section>
  );
}

function formatRank(rank?: string, elo?: number) {
  return rank ? `${rankDict[rank] ?? rank} (${elo ?? 0}점)` : "기록 없음";
}

function Stat({
  label,
  value,
  color = "gray",
  wide = false,
}: {
  label: string;
  value: string | number;
  color?: string;
  wide?: boolean;
}) {
  const colors: Record<string, string> = {
    yellow: "border-yellow-400 bg-yellow-50 text-yellow-700",
    gray: "border-gray-400 bg-gray-50 text-gray-700",
    purple: "border-purple-500 bg-purple-50 text-purple-700",
    blue: "border-blue-400 bg-blue-50 text-blue-700",
    green: "border-green-400 bg-green-50 text-green-700",
    pink: "border-pink-500 bg-pink-50 text-pink-700",
    indigo: "border-indigo-400 bg-indigo-50 text-indigo-700",
    teal: "border-teal-400 bg-teal-50 text-teal-700",
    orange: "border-orange-400 bg-orange-50 text-orange-700",
  };
  return (
    <div className={`flex justify-between rounded-r-xl border-l-4 p-5 shadow-sm ${colors[color]} ${wide ? "md:col-span-2" : ""}`}>
      <span>{label}</span>
      <span className="text-right text-xl font-black">{value}</span>
    </div>
  );
}
