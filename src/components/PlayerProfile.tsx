import { rankDict } from "../constants/brawl";
import { numberLocales, type Locale } from "../i18n/config";
import { getComponentMessages } from "../i18n/componentMessages";
import { formatDays, formatDuration } from "../i18n/formatters";
import type { PlayerData } from "../types/brawl";
import { getPlayerIconUrl } from "../utils/brawlAssets";
import BrawlImage from "./BrawlImage";
import RankedLeagueIcon from "./RankedLeagueIcon";
import GameModeIcon from "./GameModeIcon";
import StatSymbol from "./StatSymbol";
import type { ReactNode } from "react";

interface PlayerProfileProps {
  playerData: PlayerData;
  nameColor: string;
  streakCount: number;
  playTime: { hours: number; minutes: number };
  recentMatches?: number;
  recentWinRate?: number;
  actions?: ReactNode;
  actionsLabel?: string;
  locale?: Locale;
}

export default function PlayerProfile({
  playerData,
  nameColor,
  streakCount,
  playTime,
  recentMatches = 0,
  recentWinRate = 0,
  actions,
  actionsLabel,
  locale = "ko",
}: PlayerProfileProps) {
  const copy = getComponentMessages(locale).profile;
  const hubCopy = {
    ko: { recent: "최근 전투 승률", missing: "최근 전투 없음", details: "전체 프로필 통계 보기", tag: "플레이어 태그", recentCount: "전투 표본" },
    en: { recent: "Recent win rate", missing: "No recent battles", details: "View all profile stats", tag: "Player tag", recentCount: "Battles sampled" },
    ja: { recent: "最近の勝率", missing: "最近のバトルなし", details: "全プロフィール統計", tag: "プレイヤータグ", recentCount: "集計バトル" },
    "pt-br": { recent: "Vitórias recentes", missing: "Sem batalhas recentes", details: "Ver todas as estatísticas", tag: "Tag do jogador", recentCount: "Batalhas analisadas" },
    es: { recent: "Victorias recientes", missing: "Sin batallas recientes", details: "Ver todas las estadísticas", tag: "Etiqueta del jugador", recentCount: "Batallas analizadas" },
    tr: { recent: "Son galibiyet oranı", missing: "Son savaş yok", details: "Tüm profil istatistikleri", tag: "Oyuncu etiketi", recentCount: "İncelenen savaşlar" },
    de: { recent: "Letzte Siegquote", missing: "Keine letzten Kämpfe", details: "Alle Profilstatistiken", tag: "Spielertag", recentCount: "Ausgewertete Kämpfe" },
    fr: { recent: "Victoires récentes", missing: "Aucun combat récent", details: "Toutes les statistiques", tag: "Tag du joueur", recentCount: "Combats analysés" },
    it: { recent: "Vittorie recenti", missing: "Nessuna battaglia recente", details: "Tutte le statistiche", tag: "Tag giocatore", recentCount: "Battaglie analizzate" },
    ru: { recent: "Победы за последние бои", missing: "Нет недавних боёв", details: "Все показатели профиля", tag: "Тег игрока", recentCount: "Учтено боёв" },
  }[locale];
  return (
    <section className="w-full overflow-hidden border-b border-slate-200 bg-white" aria-label={copy.profileIcon}>
      <div className="py-4 sm:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {playerData.icon ? (
            <BrawlImage
              src={getPlayerIconUrl(playerData.icon.id)}
              alt={copy.profileIcon}
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 -rotate-3 rounded-xl border-4 border-[#ffdf6b] bg-[#ffdf6b] object-cover sm:h-20 sm:w-20"
              fallbackText="P"
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-lg font-black text-slate-400 sm:h-20 sm:w-20">
              P
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-normal text-slate-950 sm:text-3xl" style={{ color: `color-mix(in srgb, ${nameColor} 35%, #232238)` }}>
              {playerData.name}
            </h1>
            <p className="mt-0.5 break-all text-xs font-bold text-slate-500" title={hubCopy.tag}>
              {playerData.tag}
            </p>
            <p className="mt-1 flex min-w-0 items-center gap-1 truncate text-sm font-bold text-slate-500">
              {playerData.club ? <StatSymbol kind="shield" size={14} /> : null}
              <span className="min-w-0 truncate">{playerData.club ? `${copy.club} ${playerData.club.name}` : copy.noClub}</span>
            </p>
          </div>
        </div>

        <div className="hidden flex-wrap gap-2 sm:justify-end lg:flex">
          <Badge label={copy.highest} value={playerData.highestTrophies.toLocaleString(numberLocales[locale])} icon="trophy" />
          {streakCount > 0 ? <Badge label={copy.streak} value={formatDays(locale, streakCount)} tone="orange" icon="win" /> : null}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-[#f5f4fa] p-3 sm:grid-cols-3 sm:p-4">
        <HeroStat numeric label={copy.currentTrophies} value={playerData.trophies.toLocaleString(numberLocales[locale])}
          icon={<StatSymbol kind="trophy" size={26} />} />
        <HeroStat numeric label={hubCopy.recent} value={recentMatches > 0 ? `${recentWinRate}%` : "—"}
          detail={recentMatches > 0 ? `${recentMatches.toLocaleString(numberLocales[locale])} ${hubCopy.recentCount}` : hubCopy.missing}
          icon={<StatSymbol kind="win" size={22} className="text-blue-600" />} />
        <div className="col-span-2 sm:col-span-1">
          <HeroStat label={copy.currentRanked}
            value={playerData.rankedRankName ? formatRank(playerData.rankedRankName, playerData.rankedElo, locale) : copy.noRecord}
            icon={<RankedLeagueIcon rankName={playerData.rankedRankName} />} />
        </div>
      </div>
      {actions ? <div className="mt-4 flex flex-wrap gap-2 border-t border-blue-100 pt-4" role="group" aria-label={actionsLabel ?? copy.profileIcon}>{actions}</div> : null}
      </div>

      <details className="group pb-3 sm:pb-6">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 text-sm font-black text-blue-800 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
          {hubCopy.details}
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span>
        </summary>
      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-4">
        <Stat label={copy.highest} value={playerData.highestTrophies.toLocaleString(numberLocales[locale])} icon={<StatSymbol kind="trophy" />} />
        {streakCount > 0 ? <Stat label={copy.streak} value={formatDays(locale, streakCount)} icon={<StatSymbol kind="win" />} /> : null}
        <Stat
          label={copy.playEstimate}
          value={formatDuration(locale, playTime.hours, playTime.minutes)}
          title={copy.playEstimateTitle}
          icon={<StatSymbol kind="timer" className="text-blue-600" />}
          wide
        />
        <Stat label={copy.expLevel} value={playerData.expLevel} icon={<StatSymbol kind="level" className="text-blue-600" />} />
        <Stat label={copy.victories3v3} value={playerData["3vs3Victories"].toLocaleString(numberLocales[locale])} icon={<StatSymbol kind="players" className="text-blue-600" />} />
        <Stat label={copy.solo} value={playerData.soloVictories.toLocaleString(numberLocales[locale])} icon={<GameModeIcon modeId={48000006} size={32} />} />
        <Stat label={copy.duo} value={playerData.duoVictories.toLocaleString(numberLocales[locale])} icon={<GameModeIcon modeId={48000009} size={32} />} />
        <Stat
          label={copy.allTimeRanked}
          value={formatRank(playerData.highestAllTimeRankedRankName, playerData.highestAllTimeRankedElo, locale)}
          icon={<RankedLeagueIcon rankName={playerData.highestAllTimeRankedRankName} />}
          wide
        />
        <Stat
          label={copy.currentRanked}
          value={formatRank(playerData.rankedRankName, playerData.rankedElo, locale)}
          icon={<RankedLeagueIcon rankName={playerData.rankedRankName} />}
          wide
        />
        <Stat label={copy.roboRumble} value={playerData.bestRoboRumbleTime ?? "-"} icon={<GameModeIcon modeId={48000008} size={32} />} />
        <Stat label={copy.bigBrawler} value={playerData.bestTimeAsBigBrawler ?? "-"} icon={<GameModeIcon modeId={48000007} size={32} />} />
        <Stat
          label={copy.championship}
          value={playerData.isQualifiedFromChampionshipChallenge ? copy.qualified : copy.notQualified}
          icon={<StatSymbol kind="shield" className="text-blue-600" />}
        />
      </div>
      </details>
    </section>
  );
}

function HeroStat({ label, value, detail, icon, numeric = false }: {
  label: string; value: string; detail?: string; icon: ReactNode; numeric?: boolean;
}) {
  return (
    <div className="min-w-0 p-2 sm:p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
        {icon}
        <strong className={`font-extrabold tabular-nums text-blue-700 sm:text-3xl ${numeric ? "shrink-0 whitespace-nowrap text-2xl" : "min-w-0 break-words text-xl"}`}>{value}</strong>
      </div>
      {detail ? <p className="mt-1 text-[11px] font-medium text-slate-500">{detail}</p> : null}
    </div>
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
  icon,
}: {
  label: string;
  value: string;
  tone?: "slate" | "orange";
  icon?: "trophy" | "win";
}) {
  const toneClass =
    tone === "orange"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <span className={`inline-flex min-h-11 flex-col justify-center rounded-lg border px-3 ${toneClass}`}>
      <span className="text-[11px] font-black text-slate-500">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-black">
        {icon ? <StatSymbol kind={icon} size={18} /> : null}
        {value}
      </span>
    </span>
  );
}

function Stat({
  label,
  value,
  title,
  wide = false,
  icon,
}: {
  label: string;
  value: string | number;
  title?: string;
  wide?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:block sm:p-3 ${wide ? "sm:col-span-2" : ""}`}
      title={title}
    >
      <p className="min-w-0 flex-1 text-xs font-bold leading-5 text-slate-500 sm:truncate sm:font-black">{label}</p>
      <div className="flex min-w-0 shrink-0 items-center gap-2 sm:mt-1 sm:shrink">
        {icon}
        <p className="min-w-0 break-words text-sm font-black tabular-nums text-slate-950 sm:truncate sm:text-base">{value}</p>
      </div>
    </div>
  );
}
