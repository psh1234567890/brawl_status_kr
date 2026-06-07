import { mapDict, modeDict } from "../constants/brawl";
import type { BattleLogItem, BattleLogResponse, RecentBattleSummary } from "../types/brawl";
import { checkIsFriendly, checkIsRanked, getBattleResultInfo } from "../utils/brawlHelpers";

interface BattleLogListProps {
  battleLog: BattleLogResponse;
  summary: RecentBattleSummary;
  onSelectBattle: (match: BattleLogItem) => void;
}

export default function BattleLogList({
  battleLog,
  summary,
  onSelectBattle,
}: BattleLogListProps) {
  const displayItems = battleLog.items;
  return (
    <section className="mb-12 w-full" aria-labelledby="battle-log-title">
      <h3 id="battle-log-title" className="mb-6 border-l-8 border-indigo-500 pl-4 text-2xl font-black text-indigo-900">
        전체 기록 분석 ({summary.total}전)
      </h3>

      <div className="mb-10 flex w-full flex-col items-center justify-around gap-6 rounded-3xl border border-gray-100 bg-white p-8 shadow-xl transition-transform hover:-translate-y-1 md:flex-row">
        <div className="text-center">
          <span className="mb-2 block text-lg font-bold text-gray-500">최근 승률</span>
          <span className="text-5xl font-black text-indigo-600 drop-shadow-sm">
            {summary.winRate}%
          </span>
          <span className="mt-3 block rounded-full bg-gray-100 px-3 py-1 text-md font-bold text-gray-400">
            {summary.total}전 {summary.wins}승 {summary.defeats}패
          </span>
        </div>
        <div className="border-t-2 border-gray-200 pt-6 text-center md:border-l-2 md:border-t-0 md:pl-10 md:pt-0">
          <span className="mb-2 block text-lg font-bold text-gray-500">가장 잘 나가는 모드</span>
          <span className="text-4xl font-black text-gray-800">
            {modeDict[summary.bestMode] ?? summary.bestMode}
          </span>
          <span className="mt-3 block text-md font-bold text-indigo-500">
            이 모드에서 {summary.maxModeWins}승
          </span>
        </div>
      </div>

      <div className="mb-6 flex items-end justify-between border-l-8 border-indigo-500 pl-4">
        <h3 className="text-2xl font-black text-indigo-900">모든 전투 기록 (최대 25게임)</h3>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-bold text-gray-500">
          클릭해서 상세표 보기
        </span>
      </div>

      <div className="custom-scrollbar mb-10 flex max-h-[600px] flex-col gap-4 overflow-y-auto pr-2">
        {displayItems.map((match) => {
          const info = getBattleResultInfo(match);
          const isRanked = checkIsRanked(match);
          const isFriendly = checkIsFriendly(match);
          return (
            <button
              type="button"
              key={`${match.battleTime}-${match.event.mode}-${match.event.map}`}
              onClick={() => onSelectBattle(match)}
              className={`flex items-center justify-between rounded-2xl border-l-8 p-6 text-left shadow-md transition-transform hover:-translate-x-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${info.bgColor}`}
            >
              <span className="flex flex-col">
                <span className="mb-1 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black text-white ${isFriendly ? "bg-amber-500" : isRanked ? "bg-red-500" : "bg-green-500"}`}>
                    {isFriendly ? "친선전" : isRanked ? "경쟁전" : "일반 모드"}
                  </span>
                </span>
                <span className="mb-1 text-xl font-black text-gray-800">
                  {modeDict[match.event.mode ?? ""] ?? match.event.mode ?? "친선"} -{" "}
                  {mapDict[match.event.map ?? ""] ?? match.event.map ?? "친선 경기"}
                </span>
              </span>
              <span className="flex items-center gap-4">
                {match.battle.trophyChange && !isRanked && !isFriendly ? (
                  <span className={`text-xl font-black ${match.battle.trophyChange > 0 ? "text-yellow-500" : "text-red-500"}`}>
                    {match.battle.trophyChange > 0 ? "+" : ""}
                    {match.battle.trophyChange}🏆
                  </span>
                ) : null}
                <span className={`text-3xl font-black drop-shadow-sm ${info.resultColor}`}>
                  {info.resultText}
                  {match.battle.rank ? <span className="ml-1 text-lg">({match.battle.rank}등)</span> : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
