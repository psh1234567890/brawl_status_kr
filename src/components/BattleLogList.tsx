import { modeDict, mapDict } from "../constants/brawl";
import { getBattleResultInfo, checkIsRanked } from "../utils/brawlHelpers";

interface BattleLogListProps 
{
    battleLog: any;
    recentWinRate: number;
    totalRecent: number;
    recentWins: number;
    recentDefeats: number;
    bestMode: string;
    maxModeWins: number;
    setSelectedBattle: (match: any) => void;
}

export default function BattleLogList({
    battleLog,
    recentWinRate,
    totalRecent,
    recentWins,
    recentDefeats,
    bestMode,
    maxModeWins,
    setSelectedBattle
}: BattleLogListProps) 
{
    return (
        <div className="w-full mb-12">
            <h3 className="text-2xl font-black mb-6 text-indigo-900 border-l-8 border-indigo-500 pl-4">
                📊 전체 기록 분석 ({battleLog.items.length}전)
            </h3>
            
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full border border-gray-100 mb-10 flex flex-col md:flex-row justify-around items-center gap-6 transition-transform hover:-translate-y-1">
                <div className="text-center">
                    <span className="block text-gray-500 font-bold mb-2 text-lg">
                        최근 승률
                    </span>
                    <span className="text-5xl font-black text-indigo-600 drop-shadow-sm">
                        {recentWinRate}%
                    </span>
                    <span className="block text-md text-gray-400 mt-3 font-bold bg-gray-100 px-3 py-1 rounded-full">
                        {totalRecent}전 {recentWins}승 {recentDefeats}패
                    </span>
                </div>
                
                <div className="text-center border-t-2 md:border-t-0 md:border-l-2 border-gray-200 pt-6 md:pt-0 md:pl-10">
                    <span className="block text-gray-500 font-bold mb-2 text-lg">
                        가장 잘 나가는 모드
                    </span>
                    <span className="text-4xl font-black text-gray-800">
                        {modeDict[bestMode] ? modeDict[bestMode] : bestMode}
                    </span>
                    <span className="block text-md text-indigo-500 mt-3 font-bold">
                        이 모드에서만 {maxModeWins}승 달성! 🔥
                    </span>
                </div>
            </div>

            <div className="flex justify-between items-end mb-6 border-l-8 border-indigo-500 pl-4">
                <h3 className="text-2xl font-black text-indigo-900">
                    ⚔️ 모든 전투 기록 (최대 25게임)
                </h3>
                <span className="text-sm text-gray-500 font-bold bg-gray-200 px-3 py-1 rounded-full">
                    👆 클릭해서 상세표 보기
                </span>
            </div>

            <div className="flex flex-col gap-4 mb-10 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {battleLog.items.map((match: any, index: number) => 
                {
                    const info = getBattleResultInfo(match);
                    const isRanked = checkIsRanked(match);

                    return (
                        <div
                            key={index}
                            onClick={() => setSelectedBattle(match)}
                            className={`p-6 rounded-2xl shadow-md border-l-8 flex justify-between items-center transition-transform hover:-translate-x-1 cursor-pointer ${info.bgColor}`}
                        >
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    {isRanked ? (
                                        <span className="text-[10px] font-black text-white bg-red-500 px-2 py-0.5 rounded-full">
                                            🔴 경쟁전
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-black text-white bg-green-500 px-2 py-0.5 rounded-full">
                                            🟢 일반 모드
                                        </span>
                                    )}
                                </div>
                                <span className="font-black text-gray-800 text-xl mb-1">
                                    {modeDict[match.event.mode]
                                        ? modeDict[match.event.mode]
                                        : match.event.mode}{" "}
                                    -{" "}
                                    {mapDict[match.event.map]
                                        ? mapDict[match.event.map]
                                        : match.event.map}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                {match.battle.trophyChange ? (
                                    isRanked ? null : (
                                        <span
                                            className={`text-xl font-black ${match.battle.trophyChange > 0 ? "text-yellow-500" : "text-red-500"}`}
                                        >
                                            {match.battle.trophyChange > 0 ? "+" : ""}
                                            {match.battle.trophyChange}🏆
                                        </span>
                                    )
                                ) : null}
                                
                                <div
                                    className={`text-3xl font-black ${info.resultColor} drop-shadow-sm`}
                                >
                                    {info.resultText}
                                    {match.battle.rank ? (
                                        <span className="text-lg ml-1">
                                            ({match.battle.rank}등)
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}