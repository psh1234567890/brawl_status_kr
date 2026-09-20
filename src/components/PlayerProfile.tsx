import { rankDict } from "../constants/brawl";
import { numberLocales, type Locale } from "../i18n/config";
import { getComponentMessages } from "../i18n/componentMessages";
import { formatDays, formatDuration } from "../i18n/formatters";
import type { PlayerData } from "../types/brawl";
import { getPlayerIconUrl } from "../utils/brawlAssets";
import BrawlImage from "./BrawlImage";

interface PlayerProfileProps {
  playerData: PlayerData;
  nameColor: string;
  streakCount: number;
  playTime: { hours: number; minutes: number };
  locale?: Locale;
}

export default function PlayerProfile({
  playerData,
  nameColor,
  streakCount,
  playTime,
  locale = "ko",
}: PlayerProfileProps) {
  const copy = getComponentMessages(locale).profile;
  return (
    <section className="mb-4 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {playerData.icon ? (
            <BrawlImage
              src={getPlayerIconUrl(playerData.icon.id)}
              alt={copy.profileIcon}
              width={64}
              height={64}
              className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-cover sm:h-16 sm:w-16"
              fallbackText="P"
            />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-black text-slate-400 sm:h-16 sm:w-16">
              P
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-normal sm:text-3xl" style={{ color: nameColor }}>
              {playerData.name}
            </h1>
            <p className="mt-1 truncate text-sm font-bold text-slate-500">
              {playerData.club ? `${copy.club} ${playerData.club.name}` : copy.noClub}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Badge label={copy.currentTrophies} value={playerData.trophies.toLocaleString(numberLocales[locale])} />
          <Badge label={copy.highest} value={playerData.highestTrophies.toLocaleString(numberLocales[locale])} />
          {streakCount > 0 ? <Badge label={copy.streak} value={formatDays(locale, streakCount)} tone="orange" /> : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Stat
          label={copy.playEstimate}
          value={formatDuration(locale, playTime.hours, playTime.minutes)}
          title={copy.playEstimateTitle}
          wide
        />
        <Stat label={copy.expLevel} value={playerData.expLevel} />
        <Stat label={copy.victories3v3} value={playerData["3vs3Victories"].toLocaleString(numberLocales[locale])} />
        <Stat label={copy.solo} value={playerData.soloVictories.toLocaleString(numberLocales[locale])} />
        <Stat label={copy.duo} value={playerData.duoVictories.toLocaleString(numberLocales[locale])} />
        <Stat label={copy.allTimeRanked} value={formatRank(playerData.highestAllTimeRankedRankName, playerData.highestAllTimeRankedElo, locale)} wide />
        <Stat label={copy.currentRanked} value={formatRank(playerData.rankedRankName, playerData.rankedElo, locale)} wide />
        <Stat label={copy.roboRumble} value={playerData.bestRoboRumbleTime ?? "-"} />
        <Stat label={copy.bigBrawler} value={playerData.bestTimeAsBigBrawler ?? "-"} />
        <Stat
          label={copy.championship}
          value={playerData.isQualifiedFromChampionshipChallenge ? copy.qualified : copy.notQualified}
        />
      </div>
    </section>
  );
}

function formatRank(rank: string | undefined, elo: number | undefined, locale: Locale) {
  const displayRank = locale === "ko" && rank ? rankDict[rank] ?? rank : rank;
  return displayRank
    ? `${displayRank} (${elo ?? 0})`
    : getComponentMessages(locale).profile.noRecord;
}

function Badge({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "orange";
}) {
  const toneClass =
    tone === "orange"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <span className={`inline-flex min-h-11 flex-col justify-center rounded-lg border px-3 ${toneClass}`}>
      <span className="text-[11px] font-black text-slate-500">{label}</span>
      <span className="text-sm font-black">{value}</span>
    </span>
  );
}

function Stat({
  label,
  value,
  title,
  wide = false,
}: {
  label: string;
  value: string | number;
  title?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3 ${wide ? "sm:col-span-2" : ""}`}
      title={title}
    >
      <p className="truncate text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 truncate text-base font-black text-slate-950">{value}</p>
    </div>
  );
}
