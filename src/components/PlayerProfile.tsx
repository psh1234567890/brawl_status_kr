import { rankDict } from "../constants/brawl";

// ✨ 부모(page.tsx)에게서 받을 택배(Props) 목록을 정의하는 곳!
interface PlayerProfileProps {
    playerData: any;
    nameColorStr: string;
    streakCount: number;
    playTotalHours: number;
    playMinutes: number;
}

export default function PlayerProfile({ 
    playerData, 
    nameColorStr, 
    streakCount, 
    playTotalHours, 
    playMinutes 
}: PlayerProfileProps) {
    return (
        <div className="bg-white/80 backdrop-blur-md p-10 rounded-3xl shadow-2xl w-full text-black border border-white mb-10 transition-transform hover:-translate-y-1">
            <div className="flex flex-col items-center border-b-2 border-gray-100 pb-8 mb-8">
                <div className="flex items-center gap-4 mb-2">
                    {playerData.icon ? (
                        <img
                            src={`https://cdn.brawlify.com/profile/${playerData.icon.id}.png`}
                            alt="profile icon"
                            className="w-16 h-16 rounded-full shadow-md border-2 border-indigo-200"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                    ) : null}
                    <h2
                        className="text-5xl font-black drop-shadow-sm"
                        style={{ color: nameColorStr }}
                    >
                        {playerData.name}
                    </h2>
                </div>

                {streakCount > 0 ? (
                    <div className="mt-4 flex items-center bg-orange-100 border border-orange-300 px-6 py-2 rounded-full shadow-sm animate-pulse">
                        <span className="text-orange-600 font-black text-lg">
                            🔥 최근 {streakCount}일 연속 플레이 중!
                        </span>
                    </div>
                ) : null}

                {playerData.club ? (
                    <div className="mt-4 flex items-center bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-2 rounded-full shadow-md">
                        <span className="text-white font-bold text-lg">
                            🛡️ 소속 클럽: {playerData.club.name}
                        </span>
                    </div>
                ) : (
                    <div className="mt-4 flex items-center bg-gray-200 px-6 py-2 rounded-full shadow-inner">
                        <span className="text-gray-600 font-bold text-lg">
                            소속 클럽 없음
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg font-medium">
                <div className="flex justify-between bg-yellow-50 border-l-4 border-yellow-400 p-5 rounded-r-xl shadow-sm">
                    <span>🏆 현재 트로피:</span>
                    <span className="font-black text-yellow-600 text-xl">
                        {playerData.trophies}
                    </span>
                </div>
                <div className="flex justify-between bg-gray-50 border-l-4 border-gray-400 p-5 rounded-r-xl shadow-sm">
                    <span>⭐ 최고 트로피:</span>
                    <span className="font-black text-gray-700 text-xl">
                        {playerData.highestTrophies}
                    </span>
                </div>
                <div className="flex justify-between bg-purple-50 border-l-4 border-purple-500 p-5 rounded-r-xl shadow-sm col-span-1 md:col-span-2">
                    <span>⏱️ 예상 플레이 타임:</span>
                    <span className="font-black text-purple-700 text-xl">
                        약 {playTotalHours}시간 {playMinutes}분
                    </span>
                </div>
                <div className="flex justify-between bg-gray-50 p-5 rounded-xl shadow-sm">
                    <span>📈 경험치 레벨:</span>
                    <span className="font-bold text-xl">{playerData.expLevel}</span>
                </div>
                <div className="flex justify-between bg-gray-50 p-5 rounded-xl shadow-sm">
                    <span>⚔️ 3v3 승리:</span>
                    <span className="font-bold text-xl">
                        {playerData["3vs3Victories"]}
                    </span>
                </div>
                <div className="flex justify-between bg-blue-50 border-l-4 border-blue-400 p-5 rounded-r-xl shadow-sm">
                    <span>😈 솔로 쇼다운 승리:</span>
                    <span className="font-black text-blue-700 text-xl">
                        {playerData.soloVictories}
                    </span>
                </div>
                <div className="flex justify-between bg-green-50 border-l-4 border-green-400 p-5 rounded-r-xl shadow-sm">
                    <span>🤝 듀오 쇼다운 승리:</span>
                    <span className="font-black text-green-700 text-xl">
                        {playerData.duoVictories}
                    </span>
                </div>
                <div className="flex justify-between bg-pink-50 border-l-4 border-pink-500 p-5 rounded-r-xl shadow-sm">
                    <span>🎖️ 역대 최고 경쟁전 랭크:</span>
                    <span className="font-black text-pink-700 text-xl">
                        {playerData.highestAllTimeRankedRankName
                            ? (rankDict[playerData.highestAllTimeRankedRankName]
                                ? rankDict[playerData.highestAllTimeRankedRankName]
                                : playerData.highestAllTimeRankedRankName) +
                            " (" +
                            playerData.highestAllTimeRankedElo +
                            "점)"
                            : "기록 없음"}
                    </span>
                </div>
                <div className="flex justify-between bg-pink-50 border-l-4 border-pink-500 p-5 rounded-r-xl shadow-sm">
                    <span>🔥 현재 경쟁전 랭크:</span>
                    <span className="font-black text-pink-700 text-xl">
                        {playerData.rankedRankName
                            ? (rankDict[playerData.rankedRankName]
                                ? rankDict[playerData.rankedRankName]
                                : playerData.rankedRankName) +
                            " (" +
                            playerData.rankedElo +
                            "점)"
                            : "기록 없음"}
                    </span>
                </div>
                <div className="flex justify-between bg-indigo-50 border-l-4 border-indigo-400 p-5 rounded-r-xl shadow-sm">
                    <span>🤖 로보 럼블 최고 기록:</span>
                    <span className="font-black text-indigo-700 text-xl">
                        {playerData.bestRoboRumbleTime}
                    </span>
                </div>
                <div className="flex justify-between bg-teal-50 border-l-4 border-teal-400 p-5 rounded-r-xl shadow-sm">
                    <span>🦖 빅 브롤러 최고 기록:</span>
                    <span className="font-black text-teal-700 text-xl">
                        {playerData.bestTimeAsBigBrawler}
                    </span>
                </div>
                <div className="flex justify-between bg-orange-50 border-l-4 border-orange-400 p-5 rounded-r-xl shadow-sm md:col-span-2">
                    <span>🏆 챔피언십 챌린지 예선:</span>
                    <span className="font-black text-orange-700 text-xl">
                        {playerData.isQualifiedFromChampionshipChallenge
                            ? "통과 🎉"
                            : "미통과"}
                    </span>
                </div>
            </div>
        </div>
    );
}