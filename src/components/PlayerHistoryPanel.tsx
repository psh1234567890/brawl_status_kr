"use client";

import { useMemo, useState } from "react";
import type { PlayerHistoryResponse } from "../types/brawl";
import { translateMapName, translateModeName } from "../utils/brawlTranslations";
import { normalizePlayerTag } from "../utils/playerTag";

interface PlayerHistoryPanelProps {
  tag: string;
  history: PlayerHistoryResponse | null;
}

export default function PlayerHistoryPanel({ tag, history }: PlayerHistoryPanelProps) {
  const normalizedTag = normalizePlayerTag(tag);
  const [deleteState, setDeleteState] = useState<{
    history: PlayerHistoryResponse;
    message: string;
    tag: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const currentHistory = deleteState?.tag === normalizedTag ? deleteState.history : history;
  const deleteMessage = deleteState?.tag === normalizedTag ? deleteState.message : "";

  const orderedDays = useMemo(
    () => [...(currentHistory?.daily ?? [])].reverse(),
    [currentHistory],
  );
  const maxPlays = Math.max(1, ...orderedDays.map((day) => day.plays));
  const totalTrophyDelta = orderedDays.reduce((total, day) => total + day.trophyDelta, 0);

  async function deleteSavedData() {
    if (!window.confirm("이 플레이어 태그로 저장된 전투 기록을 삭제할까요?")) return;
    setDeleting(true);
    setDeleteState(null);
    try {
      const response = await fetch(`/api/player/history?tag=${encodeURIComponent(tag)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as { deleted?: number; error?: string };
      if (!response.ok) throw new Error(data.error ?? "삭제에 실패했습니다.");
      setDeleteState({
        tag: normalizedTag,
        history: {
          totalTrackedGames: 0,
          daily: [],
          topModes: [],
          topMaps: [],
        },
        message: `${data.deleted ?? 0}개의 저장 기록을 삭제했습니다.`,
      });
    } catch (error) {
      setDeleteState({
        tag: normalizedTag,
        history: history ?? {
          totalTrackedGames: 0,
          daily: [],
          topModes: [],
          topMaps: [],
        },
        message: error instanceof Error ? error.message : "삭제에 실패했습니다.",
      });
    } finally {
      setDeleting(false);
    }
  }

  if (!currentHistory) return null;

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-lg font-black text-slate-950">누적 활동 분석</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
            DB에 저장된 검색 기록 기반입니다. 친선전은 통계에서 제외됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void deleteSavedData()}
          disabled={deleting}
          className="min-h-11 rounded-lg border border-red-200 bg-white px-4 text-sm font-black text-red-600 transition-colors hover:bg-red-50 disabled:border-slate-200 disabled:text-slate-400"
        >
          {deleting ? "삭제 중" : "저장 데이터 삭제"}
        </button>
      </div>

      {deleteMessage ? (
        <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-700">
          {deleteMessage}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Metric label="저장된 전투" value={`${currentHistory.totalTrackedGames}개`} />
        <Metric label="기록 일수" value={`${currentHistory.daily.length}일`} />
        <Metric label="누적 트로피 변화" value={`${totalTrophyDelta > 0 ? "+" : ""}${totalTrophyDelta}`} />
      </div>

      {orderedDays.length ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-4 text-sm font-black text-slate-950">일별 활동 그래프</h3>
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
        <BucketList title="자주 플레이한 모드" rows={currentHistory.topModes} translate={translateModeName} />
        <BucketList title="자주 플레이한 맵" rows={currentHistory.topMaps} translate={translateMapName} />
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
