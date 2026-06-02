"use client";

import { useEffect } from "react";
import { brawlerDict, modeDict } from "../constants/brawl";
import type { BrawlAbility, Brawler, BrawlerStat } from "../types/brawl";
import {
  translateAbilityName,
  translateGearName,
  translateSkinName,
} from "../utils/brawlTranslations";
import BrawlImage from "./BrawlImage";

interface BrawlerDetailsModalProps {
  brawler: Brawler;
  recentStat: BrawlerStat & { topMode: string };
  dbStat?: BrawlerStat;
  onClose: () => void;
}

export default function BrawlerDetailsModal({
  brawler,
  recentStat,
  dbStat,
  onClose,
}: BrawlerDetailsModalProps) {
  useCloseOnEscape(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="brawler-dialog-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="브롤러 상세 닫기"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl font-black text-gray-800 transition-colors hover:bg-gray-200"
        >
          ×
        </button>

        <div className="mb-6 flex flex-col items-center">
          <BrawlImage
            src={`https://cdn.brawlify.com/brawlers/borders/${brawler.id}.png`}
            alt={brawler.name}
            width={112}
            height={112}
            className="mb-4 h-28 w-28 rounded-2xl border-4 border-indigo-100 shadow-md"
          />
          <h2 id="brawler-dialog-title" className="text-3xl font-black text-gray-800">
            {brawlerDict[brawler.name] ?? brawler.name}
          </h2>
          <div className="mt-2 rounded-full bg-indigo-50 px-4 py-1 font-bold text-indigo-600">
            현재 트로피: {brawler.trophies}
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-gray-50 p-5">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-gray-600">현재 장착 스킨</span>
            <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <BrawlImage
                src={`https://cdn.brawlify.com/brawlers/borders/${brawler.id}.png`}
                alt={brawler.skin?.name ?? brawler.name}
                width={48}
                height={48}
                className="h-12 w-12 rounded-md bg-indigo-50"
                title="스킨 전용 이미지가 없어 브롤러 기본 이미지를 표시합니다."
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-indigo-800">
                  {brawler.skin
                    ? translateSkinName(brawler.skin.id, brawler.skin.name)
                    : "기본 스킨"}
                </span>
                <span className="text-[11px] text-gray-400">브롤러 기본 이미지</span>
              </div>
            </div>
          </div>

          <h3 className="border-b pb-2 font-black text-gray-700">실제 보유 장비 목록</h3>
          <AbilityGroup label="가젯" abilities={brawler.gadgets} imageType="gadgets" color="green" />
          <AbilityGroup label="스타파워" abilities={brawler.starPowers} imageType="star-powers" color="yellow" />
          <AbilityGroup label="하이퍼차지" abilities={brawler.hyperCharges} imageType="hypercharges" color="purple" />

          {brawler.buffies ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-gray-600">버피 강화 상태</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["가젯", brawler.buffies.gadget],
                  ["스타파워", brawler.buffies.starPower],
                  ["하이퍼차지", brawler.buffies.hyperCharge],
                ].map(([label, active]) => (
                  <span
                    key={String(label)}
                    className={`rounded-lg border px-2 py-2 text-center text-xs font-bold ${
                      active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-gray-100 bg-white text-gray-400"
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-gray-600">기어</span>
            {brawler.gears?.length ? (
              <div className="flex flex-col gap-2">
                {brawler.gears.map((gear) => (
                  <div key={gear.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-2 shadow-sm">
                    <BrawlImage
                      src={`https://cdn.brawlify.com/gears/regular/${gear.id}.png`}
                      alt={gear.name}
                      width={32}
                      height={32}
                      fallbackText="G"
                      className="h-8 w-8 rounded-md bg-gray-100"
                    />
                    <span className="text-sm font-bold text-gray-800">
                      {translateGearName(gear.id, gear.name)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-gray-400">보유한 기어가 없습니다.</span>
            )}
          </div>
        </div>

        <StatsCard
          title="최근 25전 내 분석"
          color="blue"
          stat={recentStat}
          extra={recentStat.plays > 0 ? `주력 모드: ${modeDict[recentStat.topMode] ?? recentStat.topMode}` : undefined}
        />
        <StatsCard title="내 검색 기록 누적 승률" color="indigo" stat={dbStat} />
      </section>
    </div>
  );
}

function AbilityGroup({
  label,
  abilities,
  imageType,
  color,
}: {
  label: string;
  abilities?: BrawlAbility[];
  imageType: string;
  color: "green" | "yellow" | "purple";
}) {
  const colors = {
    green: "text-green-800 bg-green-50",
    yellow: "text-yellow-800 bg-yellow-50",
    purple: "text-purple-800 bg-purple-50",
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold text-gray-600">{label}</span>
      {abilities?.length ? (
        <div className="flex flex-col gap-2">
          {abilities.map((ability) => (
            <div key={ability.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-2 shadow-sm">
              <BrawlImage
                src={`https://cdn.brawlify.com/${imageType}/regular/${ability.id}.png`}
                alt={ability.name}
                width={32}
                height={32}
                fallbackText={label.slice(0, 1)}
                className={`h-8 w-8 rounded-md ${colors[color]}`}
              />
              <span className={`text-sm font-bold ${colors[color].split(" ")[0]}`}>
                {translateAbilityName(ability.id, ability.name)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs text-gray-400">보유한 {label}가 없습니다.</span>
      )}
    </div>
  );
}

function StatsCard({
  title,
  color,
  stat,
  extra,
}: {
  title: string;
  color: "blue" | "indigo";
  stat?: BrawlerStat;
  extra?: string;
}) {
  const isBlue = color === "blue";
  return (
    <div className={`mb-4 rounded-2xl border p-5 ${isBlue ? "border-blue-100 bg-blue-50" : "border-indigo-100 bg-indigo-50"}`}>
      <h3 className={`mb-3 border-b pb-2 font-black ${isBlue ? "border-blue-200 text-blue-900" : "border-indigo-200 text-indigo-900"}`}>
        {title}
      </h3>
      {stat && stat.plays > 0 ? (
        <div className={`flex flex-col gap-3 text-sm font-bold ${isBlue ? "text-blue-700" : "text-indigo-700"}`}>
          <div className="flex items-center justify-between">
            <span>승률</span>
            <span className="text-2xl font-black">{stat.winRate}%</span>
          </div>
          <div className="flex justify-between">
            <span>플레이 횟수</span>
            <span>{stat.plays}전 {stat.wins}승</span>
          </div>
          {extra ? <div className="rounded-lg bg-white/60 p-2">{extra}</div> : null}
        </div>
      ) : (
        <div className="py-4 text-center text-sm font-bold text-gray-400">
          아직 기록된 데이터가 없습니다.
        </div>
      )}
    </div>
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

