"use client";

import { useEffect } from "react";
import type { Locale } from "../i18n/config";
import type { BattleLogItem, BattlePlayer } from "../types/brawl";
import {
  checkIsFriendly,
  checkIsRanked,
  getBattleResultInfo,
  getPrimaryBrawler,
} from "../utils/brawlHelpers";
import {
  translateBrawlerName,
  translateMapName,
  translateModeName,
} from "../utils/brawlTranslations";
import BrawlImage from "./BrawlImage";

interface BattleDetailsModalProps {
  battle: BattleLogItem;
  onClose: () => void;
  onSelectPlayer: (tag: string) => void;
  locale?: Locale;
}

export default function BattleDetailsModal({
  battle,
  onClose,
  onSelectPlayer,
  locale = "ko",
}: BattleDetailsModalProps) {
  useCloseOnEscape(onClose);
  const result = getBattleResultInfo(battle);
  const copy = getBattleDetailsCopy(locale);
  const isRanked = checkIsRanked(battle);
  const isFriendly = checkIsFriendly(battle);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="battle-dialog-title"
        className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:max-w-4xl sm:rounded-xl sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-xl font-black text-slate-700 transition-colors hover:bg-slate-200"
        >
          ×
        </button>

        <header className="grid gap-4 pr-12 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <BattleTypeBadge friendly={isFriendly} ranked={isRanked} locale={locale} />
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black text-slate-600">
                {battle.battle.duration ? formatDuration(battle.battle.duration, locale) : copy.noTime}
              </span>
            </div>
            <h2 id="battle-dialog-title" className="truncate text-2xl font-black text-slate-950 sm:text-3xl">
              {translateModeName(battle.event.mode, locale) || copy.friendly}
            </h2>
            <p className="mt-1 truncate text-sm font-bold text-slate-500">
              {translateMapName(battle.event.map, locale) || copy.friendlyBattle}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left sm:min-w-44 sm:text-right">
            <p className={`text-3xl font-black ${result.resultColor}`}>
              {formatResult(result.isWin, result.isLoss, locale)}
              {battle.battle.rank ? <span className="ml-1 text-base">#{battle.battle.rank}</span> : null}
            </p>
            {battle.battle.trophyChange !== undefined && !isRanked && !isFriendly ? (
              <p className={`mt-1 text-sm font-black ${battle.battle.trophyChange > 0 ? "text-amber-600" : "text-red-600"}`}>
                {battle.battle.trophyChange > 0 ? "+" : ""}
                {battle.battle.trophyChange} {copy.trophies}
              </p>
            ) : isRanked ? (
              <p className="mt-1 text-xs font-black text-slate-500">{copy.rankedDeltaUnavailable}</p>
            ) : null}
          </div>
        </header>

        <div className="mt-5">
          {battle.battle.teams?.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {battle.battle.teams.map((team, index) => (
                <TeamBlock
                  key={team.map((player) => player.tag).join("-")}
                  label={`${copy.team} ${index + 1}`}
                  players={team}
                  ranked={isRanked}
                  starPlayerTag={battle.battle.starPlayer?.tag}
                  onSelectPlayer={onSelectPlayer}
                  locale={locale}
                />
              ))}
            </div>
          ) : battle.battle.players?.length ? (
            <TeamBlock
              label={copy.participants}
              players={battle.battle.players}
              ranked={isRanked}
              starPlayerTag={battle.battle.starPlayer?.tag}
              onSelectPlayer={onSelectPlayer}
              locale={locale}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
              {copy.noParticipants}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function TeamBlock({
  label,
  players,
  ranked,
  starPlayerTag,
  onSelectPlayer,
  locale,
}: {
  label: string;
  players: BattlePlayer[];
  ranked: boolean;
  starPlayerTag?: string;
  onSelectPlayer: (tag: string) => void;
  locale: Locale;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h3 className="mb-3 text-sm font-black text-slate-600">{label}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {players.map((player) => (
          <PlayerCard
            key={player.tag}
            player={player}
            ranked={ranked}
            starPlayerTag={starPlayerTag}
            onSelectPlayer={onSelectPlayer}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}

function PlayerCard({
  player,
  ranked,
  starPlayerTag,
  onSelectPlayer,
  locale,
}: {
  player: BattlePlayer;
  ranked: boolean;
  starPlayerTag?: string;
  onSelectPlayer: (tag: string) => void;
  locale: Locale;
}) {
  const brawler = getPrimaryBrawler(player) ?? { id: 0, name: "Unknown", trophies: 0 };
  const displayName = translateBrawlerName(brawler.name ?? "Unknown", locale);
  const copy = getBattleDetailsCopy(locale);

  return (
    <button
      type="button"
      onClick={() => onSelectPlayer(player.tag)}
      className="min-w-0 rounded-lg border border-slate-200 bg-white p-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
    >
      <div className="flex items-center gap-2">
        <BrawlImage
          src={`https://cdn.brawlify.com/brawlers/borders/${brawler.id ?? 0}.png`}
          alt={displayName || copy.unknown}
          width={52}
          height={52}
          fallbackText={displayName.slice(0, 1) || "?"}
          className="h-12 w-12 shrink-0 rounded-lg bg-slate-50 object-cover"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="truncate text-sm font-black text-slate-950">
              {player.name ?? player.tag}
            </span>
          </div>
          <p className="truncate text-xs font-bold text-slate-500">{displayName}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-black text-slate-500">
          {ranked ? copy.ranked : `${brawler.trophies ?? 0} ${copy.trophies}`}
        </span>
        {starPlayerTag === player.tag ? (
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-700">
            {copy.starPlayer}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function BattleTypeBadge({
  friendly,
  ranked,
  locale,
}: {
  friendly: boolean;
  ranked: boolean;
  locale: Locale;
}) {
  const copy = getBattleDetailsCopy(locale);
  const label = friendly ? copy.friendly : ranked ? copy.ranked : copy.normal;
  const className = friendly
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : ranked
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-black ${className}`}>
      {label}
    </span>
  );
}

function formatDuration(seconds: number, locale: Locale) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (locale === "en") return `${minutes}m ${remainingSeconds}s`;
  if (locale === "ja") return `${minutes}分 ${remainingSeconds}秒`;
  return `${minutes}분 ${remainingSeconds}초`;
}

function formatResult(isWin: boolean, isLoss: boolean, locale: Locale) {
  const copy = getBattleDetailsCopy(locale);
  return isWin ? copy.victory : isLoss ? copy.defeat : copy.draw;
}

function getBattleDetailsCopy(locale: Locale) {
  if (locale === "en") return {
    close: "Close battle details", noTime: "Time unavailable", friendly: "Friendly", friendlyBattle: "Friendly battle", ranked: "Ranked", normal: "Normal",
    trophies: "trophies", rankedDeltaUnavailable: "Ranked rating change unavailable", team: "Team", participants: "Participants", noParticipants: "No participant data is available.",
    unknown: "Unknown", starPlayer: "Star Player", victory: "Victory", defeat: "Defeat", draw: "Draw",
  } as const;
  if (locale === "ja") return {
    close: "バトル詳細を閉じる", noTime: "時間情報なし", friendly: "フレンド", friendlyBattle: "フレンドバトル", ranked: "ランク", normal: "通常",
    trophies: "トロフィー", rankedDeltaUnavailable: "ランクレート変動情報なし", team: "チーム", participants: "参加者", noParticipants: "表示できる参加者データがありません。",
    unknown: "不明", starPlayer: "スタープレイヤー", victory: "勝利", defeat: "敗北", draw: "引き分け",
  } as const;
  return {
    close: "전투 상세 닫기", noTime: "시간 정보 없음", friendly: "친선", friendlyBattle: "친선 경기", ranked: "경쟁전", normal: "일반",
    trophies: "트로피", rankedDeltaUnavailable: "경쟁전 점수 변화 미제공", team: "팀", participants: "참가자", noParticipants: "표시할 수 있는 참가자 기록이 없습니다.",
    unknown: "알 수 없음", starPlayer: "스타 플레이어", victory: "승리", defeat: "패배", draw: "무승부",
  } as const;
}

function useCloseOnEscape(onClose: () => void) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
}
