import type { Brawler, PlayerSkinInventoryResponse, PlayerSkinInventoryStatus } from "../types/brawl";
import { numberLocales, type Locale } from "../i18n/config";
import { getComponentMessages } from "../i18n/componentMessages";
import {
  formatBrawlerDetailsAria,
  formatBrawlerListDescription,
  formatOwnedCount,
} from "../i18n/formatters";
import { translateBrawlerName } from "../utils/brawlTranslations";
import BrawlImage from "./BrawlImage";

interface BrawlerListProps {
  brawlers: Brawler[];
  skinInventory?: PlayerSkinInventoryResponse | null;
  skinInventoryStatus?: PlayerSkinInventoryStatus;
  skinInventoryError?: string;
  onLoadSkinInventory: () => void | Promise<void>;
  onSelectBrawler: (brawler: Brawler) => void;
  locale?: Locale;
}

export default function BrawlerList({
  brawlers,
  skinInventory,
  skinInventoryStatus = "idle",
  skinInventoryError = "",
  onLoadSkinInventory,
  onSelectBrawler,
  locale = "ko",
}: BrawlerListProps) {
  const copy = getComponentMessages(locale).brawlerList;
  const isSkinLoading = skinInventoryStatus === "loading" && !skinInventory;
  const hasSkinInventory = Boolean(skinInventory);
  const skinStatusLabel =
    skinInventoryStatus === "loading"
      ? copy.skinLoading
      : skinInventoryStatus === "error"
        ? copy.skinError
        : skinInventoryStatus === "ready"
          ? copy.skinReady
          : copy.skinIdle;
  const skinActionLabel =
    skinInventoryStatus === "loading"
      ? copy.loading
      : skinInventoryStatus === "ready"
        ? copy.skinRefresh
        : skinInventoryStatus === "error"
          ? copy.skinRetry
          : copy.skinLookup;

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="brawler-list-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="brawler-list-title" className="text-lg font-black text-slate-950">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {formatBrawlerListDescription(locale, brawlers.length)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600"
            title={skinInventoryError || undefined}
          >
            {skinStatusLabel}
          </span>
          <button
            type="button"
            onClick={() => void onLoadSkinInventory()}
            disabled={skinInventoryStatus === "loading"}
            className="min-h-9 rounded-lg bg-blue-600 px-3 text-xs font-black text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500"
          >
            {skinActionLabel}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {[...brawlers]
          .sort((left, right) => right.trophies - left.trophies)
          .map((brawler) => {
            const displayName = translateBrawlerName(brawler.name, locale);
            const skinCount = getSkinCount(brawler, skinInventory);

            return (
              <button
                type="button"
                key={brawler.id}
                onClick={() => onSelectBrawler(brawler)}
                aria-label={formatBrawlerDetailsAria(locale, displayName)}
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
                    <span>{copy.skins}</span>
                    <span>
                      {isSkinLoading
                        ? copy.loading
                        : hasSkinInventory
                          ? formatOwnedCount(locale, skinCount)
                          : "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-auto pt-3">
                  <div className="flex items-end justify-between gap-2">
                    <span>
                      <span className="block text-[11px] font-black text-slate-500">{copy.trophies}</span>
                      <span className="block text-lg font-black text-slate-950">{brawler.trophies.toLocaleString(numberLocales[locale])}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[11px] font-black text-slate-500">{copy.highest}</span>
                      <span className="block text-sm font-black text-slate-700">{brawler.highestTrophies.toLocaleString(numberLocales[locale])}</span>
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
