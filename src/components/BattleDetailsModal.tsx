"use client";

import { useEffect } from "react";
import { mapDict, modeDict } from "../constants/brawl";
import type { BattleLogItem, BattlePlayer } from "../types/brawl";
import {
  checkIsRanked,
  getBattleResultInfo,
  getPrimaryBrawler,
} from "../utils/brawlHelpers";
import BrawlImage from "./BrawlImage";

interface BattleDetailsModalProps {
  battle: BattleLogItem;
  onClose: () => void;
  onSelectPlayer: (tag: string) => void;
}

export default function BattleDetailsModal({
  battle,
  onClose,
  onSelectPlayer,
}: BattleDetailsModalProps) {
  useCloseOnEscape(onClose);
  const result = getBattleResultInfo(battle);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="battle-dialog-title"
        className="relative my-8 w-full max-w-4xl overflow-hidden rounded-xl border-4 border-black bg-[#a5add6] shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="전투 상세 닫기"
          className="absolute right-4 top-2 z-10 text-3xl font-black text-white drop-shadow-md hover:text-gray-300"
        >
          ×
        </button>

        <header className="flex items-center justify-between border-b-4 border-black bg-[#8f98c6] p-4 pr-14">
          <div className="flex flex-col">
            <h2 id="battle-dialog-title" className="text-2xl font-black text-white drop-shadow-md">
              {modeDict[battle.event.mode ?? ""] ?? battle.event.mode ?? "친선"}
            </h2>
            <span className="font-bold text-gray-200">{mapDict[battle.event.map ?? ""] ?? battle.event.map ?? "친선 경기"}</span>
          </div>
          <span className={`text-4xl font-black drop-shadow-md ${result.isWin ? "text-green-400" : result.isLoss ? "text-red-500" : "text-gray-300"}`}>
            {result.resultText}
          </span>
          <div className="flex flex-col items-end">
            <span className="text-xl font-black text-white drop-shadow-md">
              {battle.battle.duration
                ? `${Math.floor(battle.battle.duration / 60)}분 ${battle.battle.duration % 60}초`
                : "시간 불명"}
            </span>
            {battle.battle.trophyChange && !checkIsRanked(battle) ? (
              <span className="mt-1 text-2xl font-black text-yellow-400 drop-shadow-md">
                {battle.battle.trophyChange > 0 ? "+" : ""}
                {battle.battle.trophyChange} 🏆
              </span>
            ) : checkIsRanked(battle) ? (
              <span className="mt-1 text-sm font-black text-red-200">경쟁전 점수 증감 미제공</span>
            ) : null}
          </div>
        </header>

        <div className="p-6">
          {battle.battle.teams?.length ? (
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              {battle.battle.teams.map((team, index) => (
                <div key={team.map((player) => player.tag).join("-")} className="contents">
                  {index > 0 ? (
                    <div className="px-4 text-5xl font-black italic text-white drop-shadow-md">VS</div>
                  ) : null}
                  <div className="flex flex-wrap justify-center gap-2">
                    {team.map((player) => (
                      <PlayerCard
                        key={player.tag}
                        player={player}
                        ranked={checkIsRanked(battle)}
                        starPlayerTag={battle.battle.starPlayer?.tag}
                        onSelectPlayer={onSelectPlayer}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : battle.battle.players?.length ? (
            <div className="flex flex-wrap justify-center gap-4">
              {battle.battle.players.map((player) => (
                <PlayerCard
                  key={player.tag}
                  player={player}
                  ranked={checkIsRanked(battle)}
                  starPlayerTag={battle.battle.starPlayer?.tag}
                  onSelectPlayer={onSelectPlayer}
                />
              ))}
            </div>
          ) : (
            <div className="py-10 text-center font-bold text-white">표시할 수 없는 기록입니다.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function PlayerCard({
  player,
  ranked,
  starPlayerTag,
  onSelectPlayer,
}: {
  player: BattlePlayer;
  ranked: boolean;
  starPlayerTag?: string;
  onSelectPlayer: (tag: string) => void;
}) {
  const brawler = getPrimaryBrawler(player) ?? { id: 0, name: "Unknown", trophies: 0 };
  return (
    <button
      type="button"
      onClick={() => onSelectPlayer(player.tag)}
      className="group relative flex w-24 flex-col items-center transition-transform hover:-translate-y-2 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-yellow-300"
    >
      {starPlayerTag === player.tag ? (
        <span className="absolute -top-3 z-10 whitespace-nowrap rounded-sm border-2 border-black bg-yellow-400 px-2 py-0.5 text-[10px] font-black text-black">
          스타 플레이어
        </span>
      ) : null}
      <span className="relative h-20 w-20 overflow-hidden rounded-md border-4 border-black bg-gray-800 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] transition-colors group-hover:border-yellow-300">
        <span className="absolute left-0 top-0 z-10 rounded-br-md bg-black/60 px-1 text-xs font-black text-yellow-400">
          {ranked ? "픽" : `🏆 ${brawler.trophies ?? 0}`}
        </span>
        <BrawlImage
          src={`https://cdn.brawlify.com/brawlers/borders/${brawler.id ?? 0}.png`}
          alt={brawler.name ?? "Unknown"}
          width={80}
          height={80}
          className="h-full w-full object-cover"
        />
      </span>
      <span className="mt-2 w-full truncate text-center text-sm font-bold text-white group-hover:text-yellow-300 group-hover:underline">
        {player.name ?? player.tag}
      </span>
    </button>
  );
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

