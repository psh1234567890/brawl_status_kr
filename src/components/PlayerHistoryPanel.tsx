"use client";

import { useMemo } from "react";
import type { PlayerHistoryResponse } from "../types/brawl";
import { translateMapName, translateModeName } from "../utils/brawlTranslations";

interface PlayerHistoryPanelProps {
  history: PlayerHistoryResponse | null;
}

export default function PlayerHistoryPanel({ history }: PlayerHistoryPanelProps) {
  const orderedDays = useMemo(
    () => [...(history?.daily ?? [])].reverse(),
    [history],
  );
  const maxPlays = Math.max(1, ...orderedDays.map((day) => day.plays));
  if (!history) return null;

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h2 className="text-lg font-black text-slate-950">누적 활동 분석</h2>
        <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
          DB에 저장된 검색 기록 기반입니다. 친선전은 통계에서 제외됩니다.
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Metric label="전체 저장 전투" value={`${history.totalTrackedGames}개`} />
        <Metric label="전체 기록 일수" value={`${history.trackedDays}일`} />
        <Metric label="전체 트로피 변화" value={`${history.totalTrophyDelta > 0 ? "+" : ""}${history.totalTrophyDelta}`} />
      </div>

      {orderedDays.length ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-1 text-sm font-black text-slate-950">최근 활동 그래프</h3>
          <p className="mb-4 text-xs font-bold text-slate-500">최근 최대 60개 활동일 중 마지막 21개를 표시합니다.</p>
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
                <span className="text-right">{day.plays}전 · {Math.floor((day.wins / Math.max(1, day.plays)) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
          아직 누적 기록이 없습니다. 검색할수록 장기 분석이 채워집니다.
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <BucketList title="자주 플레이한 모드" rows={history.topModes} translate={translateModeName} />
        <BucketList title="자주 플레이한 맵" rows={history.topMaps} translate={translateMapName} />
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
}: {
  title: string;
  rows: { name: string; plays: number; winRate: number; trophyDelta: number }[];
  translate: (name: string) => string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-black text-slate-950">{title}</h3>
      {rows.length ? (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.name} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
              <span className="min-w-0 truncate text-sm font-black text-slate-800">{translate(row.name)}</span>
              <span className="shrink-0 text-xs font-bold text-blue-700">
                {row.winRate}% · {row.plays}전 · {row.trophyDelta > 0 ? "+" : ""}{row.trophyDelta}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm font-bold text-slate-400">데이터가 없습니다.</p>
      )}
    </div>
  );
}
