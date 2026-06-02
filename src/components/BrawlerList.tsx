import { brawlerDict } from "../constants/brawl";

interface BrawlerListProps 
{
    playerData: any;
    setSelectedBrawler: (brawler: any) => void;
}

export default function BrawlerList({ playerData, setSelectedBrawler }: BrawlerListProps) 
{
    return (
        <div className="w-full">
            <div className="flex justify-between items-end mb-6 border-l-8 border-indigo-500 pl-4">
                <h3 className="text-2xl font-black text-indigo-900">
                    보유 브롤러 상세 정보 ({playerData.brawlers.length}개)
                </h3>
                <span className="text-sm text-gray-500 font-bold bg-gray-200 px-3 py-1 rounded-full">
                    👆 클릭해서 아이템 확인
                </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {[...playerData.brawlers]
                    .sort((a: any, b: any) => 
                    {
                        return b.trophies - a.trophies;
                    })
                    .map((brawler: any) => 
                    {
                        return (
                            <div
                                key={brawler.id}
                                onClick={() => setSelectedBrawler(brawler)}
                                className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 flex flex-col items-center transition-transform hover:-translate-y-2 hover:shadow-xl cursor-pointer ring-2 ring-transparent hover:ring-indigo-300"
                            >
                                <img
                                    src={`https://cdn.brawlify.com/brawlers/borders/${brawler.id}.png`}
                                    alt={brawler.name}
                                    className="w-20 h-20 mb-3 rounded-xl shadow-sm"
                                    onError={(e) => 
                                    {
                                        (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                />
                                <span className="font-black text-gray-800 text-lg mb-1">
                                    {brawlerDict[brawler.name]
                                        ? brawlerDict[brawler.name]
                                        : brawler.name}
                                </span>
                                <span className="text-xs text-white bg-indigo-500 px-2 py-1 rounded-md font-bold mb-3">
                                    파워 {brawler.power}
                                </span>
                                <div className="flex gap-2 text-xs text-gray-500 mb-3 font-bold bg-gray-50 w-full justify-center py-2 rounded-lg">
                                    <span>
                                        🟢 {brawler.gadgets ? brawler.gadgets.length : 0}
                                    </span>
                                    <span>
                                        ⭐{" "}
                                        {brawler.starPowers ? brawler.starPowers.length : 0}
                                    </span>
                                    <span>
                                        🔥{" "}
                                        {brawler.hyperCharges ? brawler.hyperCharges.length : 0}
                                    </span>
                                </div>
                                
                                {/* ✨ 바로 이 부분이 새롭게 추가된 트로피/최고기록 UI 상자야! */}
                                <div className="flex flex-col items-center bg-yellow-50 w-full rounded-lg py-2 border border-yellow-100 mt-auto">
                                    <span className="text-yellow-600 font-black text-xl">
                                        🏆 {brawler.trophies}
                                    </span>
                                    <span className="text-gray-400 font-bold text-xs mt-1">
                                        최고 기록: {brawler.highestTrophies}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
