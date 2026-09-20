"use client";

import { useMemo } from "react";
import type { Locale } from "../i18n/config";
import type { PlayerHistoryResponse } from "../types/brawl";
import { translateMapName, translateModeName } from "../utils/brawlTranslations";

interface PlayerHistoryPanelProps {
  history: PlayerHistoryResponse | null;
  locale?: Locale;
}

export default function PlayerHistoryPanel({ history, locale = "ko" }: PlayerHistoryPanelProps) {
  const copy = getHistoryCopy(locale);
  const orderedDays = useMemo(
    () => [...(history?.daily ?? [])].reverse(),
    [history],
  );
  const maxPlays = Math.max(1, ...orderedDays.map((day) => day.plays));
  if (!history) return null;

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h2 className="text-lg font-black text-slate-950">{copy.title}</h2>
        <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
          {copy.description}
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Metric label={copy.totalBattles} value={copy.battles(history.totalTrackedGames)} />
        <Metric label={copy.trackedDays} value={copy.days(history.trackedDays)} />
        <Metric label={copy.trophyDelta} value={`${history.totalTrophyDelta > 0 ? "+" : ""}${history.totalTrophyDelta}`} />
      </div>

      {orderedDays.length ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-1 text-sm font-black text-slate-950">{copy.graphTitle}</h3>
          <p className="mb-4 text-xs font-bold text-slate-500">{copy.graphDescription}</p>
          <div className="flex flex-col gap-2">
            {orderedDays.slice(-21).map((day) => (
              <div key={day.day} className="grid grid-cols-[52px_1fr_68px] items-center gap-2 text-xs font-bold text-slate-600 sm:grid-cols-[84px_1fr_96px] sm:gap-3">
                <span>{day.day.slice(5)}</span>
                <div className="h-3 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${Math.max(8, (day.plays / maxPlays) * 100)}%` }}
                  />
                </div>
                <span className="text-right">{copy.battles(day.plays)} · {Math.floor((day.wins / Math.max(1, day.plays)) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
          {copy.empty}
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <BucketList title={copy.topModes} rows={history.topModes} translate={(name) => translateModeName(name, locale)} locale={locale} />
        <BucketList title={copy.topMaps} rows={history.topMaps} translate={(name) => translateMapName(name, locale)} locale={locale} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function BucketList({
  title,
  rows,
  translate,
  locale,
}: {
  title: string;
  rows: { name: string; plays: number; winRate: number; trophyDelta: number }[];
  translate: (name: string) => string;
  locale: Locale;
}) {
  const copy = getHistoryCopy(locale);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-black text-slate-950">{title}</h3>
      {rows.length ? (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.name} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
              <span className="min-w-0 truncate text-sm font-black text-slate-800">{translate(row.name)}</span>
              <span className="shrink-0 text-xs font-bold text-blue-700">
                {row.winRate}% · {copy.battles(row.plays)} · {row.trophyDelta > 0 ? "+" : ""}{row.trophyDelta}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm font-bold text-slate-400">{copy.noData}</p>
      )}
    </div>
  );
}

function getHistoryCopy(locale: Locale) {
  if (locale === "en") return {
    title: "Accumulated Activity", description: "Based on search records stored in the database. Friendly battles are excluded from statistics.", totalBattles: "Total stored battles",
    trackedDays: "Tracked days", trophyDelta: "Total trophy change", graphTitle: "Recent activity", graphDescription: "Shows the latest 21 of up to 60 active days.",
    empty: "No accumulated history yet. Long-term analysis fills in as you keep searching.", topModes: "Most played modes", topMaps: "Most played maps", noData: "No data.",
    battles: (n: number) => `${n} battles`, days: (n: number) => `${n} days`,
  } as const;
  if (locale === "ja") return {
    title: "累積アクティビティ", description: "DBに保存された検索履歴を基にしています。フレンドバトルは統計から除外されます。", totalBattles: "保存バトル合計",
    trackedDays: "記録日数", trophyDelta: "トロフィー変化合計", graphTitle: "最近のアクティビティ", graphDescription: "最大60活動日のうち直近21日を表示します。",
    empty: "累積履歴はまだありません。検索するほど長期分析が充実します。", topModes: "よく遊ぶモード", topMaps: "よく遊ぶマップ", noData: "データがありません。",
    battles: (n: number) => `${n}戦`, days: (n: number) => `${n}日`,
  } as const;
  return {
    title: "누적 활동 분석", description: "DB에 저장된 검색 기록 기반입니다. 친선전은 통계에서 제외됩니다.", totalBattles: "전체 저장 전투",
    trackedDays: "전체 기록 일수", trophyDelta: "전체 트로피 변화", graphTitle: "최근 활동 그래프", graphDescription: "최근 최대 60개 활동일 중 마지막 21개를 표시합니다.",
    empty: "아직 누적 기록이 없습니다. 검색할수록 장기 분석이 채워집니다.", topModes: "자주 플레이한 모드", topMaps: "자주 플레이한 맵", noData: "데이터가 없습니다.",
    battles: (n: number) => `${n}전`, days: (n: number) => `${n}일`,
  } as const;
}
