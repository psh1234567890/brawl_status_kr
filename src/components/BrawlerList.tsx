import type { Brawler, PlayerSkinInventoryResponse, PlayerSkinInventoryStatus } from "../types/brawl";
import { translateBrawlerName } from "../utils/brawlTranslations";
import BrawlImage from "./BrawlImage";

interface BrawlerListProps {
  brawlers: Brawler[];
  skinInventory?: PlayerSkinInventoryResponse | null;
  skinInventoryStatus?: PlayerSkinInventoryStatus;
  skinInventoryError?: string;
  onSelectBrawler: (brawler: Brawler) => void;
}

export default function BrawlerList({
  brawlers,
  skinInventory,
  skinInventoryStatus = "idle",
  skinInventoryError = "",
  onSelectBrawler,
}: BrawlerListProps) {
  const isSkinLoading = skinInventoryStatus === "loading" && !skinInventory;
  const skinStatusLabel =
    skinInventoryStatus === "loading"
      ? "보유 스킨 조회 중"
      : skinInventoryStatus === "error"
        ? "보유 스킨 일부 미표시"
        : skinInventoryStatus === "ready"
          ? "보유 스킨 조회 완료"
          : "브롤러 클릭 후 상세 확인";

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="brawler-list-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="brawler-list-title" className="text-lg font-black text-slate-950">
            보유 브롤러
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {brawlers.length}개 보유. 카드를 누르면 스킨, 가젯, 스타파워, 기어를 확인할 수 있습니다.
          </p>
        </div>
        <span
          className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600"
          title={skinInventoryError || undefined}
        >
          {skinStatusLabel}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {[...brawlers]
          .sort((left, right) => right.trophies - left.trophies)
          .map((brawler) => {
            const displayName = translateBrawlerName(brawler.name);
            const skinCount = getSkinCount(brawler, skinInventory);

            return (
              <button
                type="button"
                key={brawler.id}
                onClick={() => onSelectBrawler(brawler)}
                aria-label={`${displayName} 상세 보기`}
                className="group flex min-h-[238px] flex-col rounded-lg border border-slate-200 bg-white p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <div className="flex items-start justify-between gap-2">
                  <BrawlImage
                    src={`https://cdn.brawlify.com/brawlers/borders/${brawler.id}.png`}
                    alt={displayName}
                    width={72}
                    height={72}
                    fallbackText={displayName.slice(0, 1)}
                    className="h-16 w-16 shrink-0 rounded-lg bg-slate-50 object-cover sm:h-[72px] sm:w-[72px]"
                  />
                  <span className="rounded-md bg-slate-950 px-2 py-1 text-[11px] font-black text-white">
                    P{brawler.power}
                  </span>
                </div>

                <span className="mt-3 line-clamp-2 min-h-10 text-base font-black leading-5 text-slate-950">
                  {displayName}
                </span>

                <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[11px] font-black">
                  <SmallStat label="G" value={brawler.gadgets?.length ?? 0} />
                  <SmallStat label="SP" value={brawler.starPowers?.length ?? 0} />
                  <SmallStat label="HC" value={brawler.hyperCharges?.length ?? 0} />
                </div>

                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                  <div className="flex items-center justify-between gap-2 text-xs font-black text-slate-700">
                    <span>스킨</span>
                    <span>{isSkinLoading ? "조회 중" : `${skinCount}개`}</span>
                  </div>
                </div>

                <div className="mt-auto pt-3">
                  <div className="flex items-end justify-between gap-2">
                    <span>
                      <span className="block text-[11px] font-black text-slate-500">트로피</span>
                      <span className="block text-lg font-black text-slate-950">{brawler.trophies.toLocaleString("ko-KR")}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[11px] font-black text-slate-500">최고</span>
                      <span className="block text-sm font-black text-slate-700">{brawler.highestTrophies.toLocaleString("ko-KR")}</span>
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </section>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-slate-700">
      {label} {value}
    </span>
  );
}

function getSkinCount(brawler: Brawler, skinInventory: PlayerSkinInventoryResponse | null | undefined) {
  const externalSkins = skinInventory?.byBrawler[normalizeBrawlerSkinKey(brawler.name)];
  if (externalSkins?.length) return externalSkins.length;
  return brawler.skins?.length ?? (brawler.skin ? 1 : 0);
}

function normalizeBrawlerSkinKey(value: string) {
  return value
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "");
}
