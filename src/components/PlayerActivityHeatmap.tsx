"use client";

import { useMemo } from "react";
import type { PlayerHistoryDay } from "../types/brawl";
import type { Locale } from "../i18n/config";
import { buildActivityHeatmap, heatmapIntensity } from "../utils/activityHeatmap";

const labels = {
  ko: {
    title: "최근 90일 활동 히트맵",
    note: "색상은 해당 날짜에 수집된 전투 기록 수를 나타내. 기록이 없는 날짜는 실제로 플레이하지 않은 날이 아닐 수도 있어.",
    unknown: "수집 기록 없음", games: "수집 경기", days: "기록된 활동일", legend: "많음",
  },
  en: {
    title: "90-day activity heatmap",
    note: "Colors indicate collected battle records, not all games played. A blank day may simply mean the player was not tracked.",
    unknown: "No records collected", games: "Recorded battles", days: "Recorded days", legend: "More",
  },
  ja: {
    title: "過去90日のアクティビティ",
    note: "色は保存された対戦履歴の数です。空白の日でもゲームをプレイしていないとは限りません。",
    unknown: "記録なし", games: "記録された試合", days: "記録日数", legend: "多い",
  },
};

const colors = ["bg-slate-200", "bg-blue-200", "bg-blue-400", "bg-blue-600", "bg-blue-800"] as const;

export default function PlayerActivityHeatmap({ daily, locale = "ko" }: {
  daily: PlayerHistoryDay[];
  locale?: Locale;
}) {
  const view = useMemo(() => buildActivityHeatmap(daily), [daily]);
  const copy = locale === "ko" ? labels.ko : locale === "ja" ? labels.ja : labels.en;
  return <section aria-labelledby="activity-heatmap-title" className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 id="activity-heatmap-title" className="text-sm font-black text-slate-950">{copy.title}</h3>
      <p className="text-xs font-semibold text-blue-700">{copy.days}: {view.recordedDays} / 90</p>
    </div>
    <p className="mt-2 text-xs leading-5 text-slate-500">{copy.note}</p>
    <div aria-label={copy.title} role="group" className="mt-4 flex justify-center overflow-x-auto">
      <div className="grid grid-flow-col grid-rows-7 gap-1">
        {Array.from({ length: view.leadingBlanks }, (_, i) =>
          <span key={"pad-" + i} aria-hidden="true" className="h-3 w-3" />
        )}
        {view.days.map((item) => {
          const status = item.plays === null ? copy.unknown : copy.games + ": " + item.plays;
          const title = item.day + " · " + status;
          return <span key={item.day} role="img" title={title} aria-label={title}
            className={"h-3 w-3 rounded-[3px] " + colors[heatmapIntensity(item.plays, view.maxPlays)]} />;
        })}
      </div>
    </div>
    <div className="mt-3 flex items-center justify-end gap-1 text-xs text-slate-500">
      <span>{copy.unknown}</span>
      {colors.map((color) => <span key={color} aria-hidden="true" className={"h-3 w-3 rounded-[3px] " + color}/>)}
      <span>{copy.legend}</span>
    </div>
  </section>;
}
