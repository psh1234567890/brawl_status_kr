import { brawlerDict } from "../constants/brawl";
import type { Brawler } from "../types/brawl";
import BrawlImage from "./BrawlImage";

interface BrawlerListProps {
  brawlers: Brawler[];
  onSelectBrawler: (brawler: Brawler) => void;
}

export default function BrawlerList({ brawlers, onSelectBrawler }: BrawlerListProps) {
  return (
    <section className="w-full" aria-labelledby="brawler-list-title">
      <div className="mb-6 flex items-end justify-between border-l-8 border-indigo-500 pl-4">
        <h3 id="brawler-list-title" className="text-2xl font-black text-indigo-900">
          보유 브롤러 상세 정보 ({brawlers.length}개)
        </h3>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-bold text-gray-500">
          클릭해서 아이템 확인
        </span>
      </div>

      <div className="grid grid-cols-2 gap-5 md:grid-cols-4 lg:grid-cols-5">
        {[...brawlers]
          .sort((left, right) => right.trophies - left.trophies)
          .map((brawler) => (
            <button
              type="button"
              key={brawler.id}
              onClick={() => onSelectBrawler(brawler)}
              className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-md ring-2 ring-transparent transition-transform hover:-translate-y-2 hover:shadow-xl hover:ring-indigo-300 focus:outline-none focus:ring-indigo-500"
            >
              <BrawlImage
                src={`https://cdn.brawlify.com/brawlers/borders/${brawler.id}.png`}
                alt={brawler.name}
                width={80}
                height={80}
                className="mb-3 h-20 w-20 rounded-xl shadow-sm"
              />
              <span className="mb-1 text-lg font-black text-gray-800">
                {brawlerDict[brawler.name] ?? brawler.name}
              </span>
              <span className="mb-3 rounded-md bg-indigo-500 px-2 py-1 text-xs font-bold text-white">
                파워 {brawler.power}
              </span>
              <span className="mb-3 flex w-full justify-center gap-2 rounded-lg bg-gray-50 py-2 text-xs font-bold text-gray-500">
                <span>가젯 {brawler.gadgets?.length ?? 0}</span>
                <span>SP {brawler.starPowers?.length ?? 0}</span>
                <span>HC {brawler.hyperCharges?.length ?? 0}</span>
              </span>
              <span className="mb-3 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-500">
                스킨 {brawler.skins?.length ?? (brawler.skin ? 1 : 0)}
              </span>
              <span className="mt-auto flex w-full flex-col items-center rounded-lg border border-yellow-100 bg-yellow-50 py-2">
                <span className="text-xl font-black text-yellow-600">🏆 {brawler.trophies}</span>
                <span className="mt-1 text-xs font-bold text-gray-400">
                  최고 기록: {brawler.highestTrophies}
                </span>
              </span>
            </button>
          ))}
      </div>
    </section>
  );
}
