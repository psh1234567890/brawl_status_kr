"use client";

import { useMemo, useState } from "react";
import { mapDict, modeDict } from "../constants/brawl";
import type { PlayerHistoryResponse } from "../types/brawl";

interface PlayerHistoryPanelProps {
  tag: string;
  history: PlayerHistoryResponse | null;
}

export default function PlayerHistoryPanel({ tag, history }: PlayerHistoryPanelProps) {
  const [currentHistory, setCurrentHistory] = useState(history);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  const orderedDays = useMemo(
    () => [...(currentHistory?.daily ?? [])].reverse(),
    [currentHistory],
  );
  const maxPlays = Math.max(1, ...orderedDays.map((day) => day.plays));
  const totalTrophyDelta = orderedDays.reduce((total, day) => total + day.trophyDelta, 0);

  async function deleteSavedData() {
    if (!window.confirm("이 플레이어 태그로 저장된 전투 기록을 삭제할까요?")) return;
    setDeleting(true);
    setDeleteMessage("");
    try {
      const response = await fetch(`/api/player/history?tag=${encodeURIComponent(tag)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as { deleted?: number; error?: string };
      if (!response.ok) throw new Error(data.error ?? "삭제에 실패했습니다.");
      setCurrentHistory({
        totalTrackedGames: 0,
        daily: [],
        topModes: [],
        topMaps: [],
      });
      setDeleteMessage(`${data.deleted ?? 0}개의 저장 기록을 삭제했습니다.`);
    } catch (error) {
      setDeleteMessage(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  if (!currentHistory) return null;

  return (
    <section className="mb-12 w-full rounded-3xl border border-white bg-white/90 p-6 shadow-xl">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h3 className="text-2xl font-black text-indigo-900">누적 활동 분석</h3>
          <p className="mt-1 text-sm font-bold text-gray-500">
            DB에 저장된 검색 기록 기반입니다. 친선전은 통계에서 제외됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void deleteSavedData()}
          disabled={deleting}
          className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:text-gray-400"
        >
          {deleting ? "삭제 중..." : "저장 데이터 삭제"}
        </button>
      </div>

      {deleteMessage ? (
        <p className="mb-4 rounded-lg bg-indigo-50 p-3 text-sm font-bold text-indigo-700">
          {deleteMessage}
        </p>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Metric label="저장된 전투" value={`${currentHistory.totalTrackedGames}전`} />
        <Metric label="기록 일수" value={`${currentHistory.daily.length}일`} />
        <Metric label="누적 트로피 변화" value={`${totalTrophyDelta > 0 ? "+" : ""}${totalTrophyDelta}`} />
      </div>

      {orderedDays.length ? (
        <div className="mb-6 rounded-2xl bg-indigo-50 p-4">
          <h4 className="mb-4 font-black text-indigo-900">일별 활동 그래프</h4>
          <div className="flex flex-col gap-2">
            {orderedDays.slice(-21).map((day) => (
              <div key={day.day} className="grid grid-cols-[92px_1fr_84px] items-center gap-3 text-xs font-bold text-gray-600">
                <span>{day.day.slice(5)}</span>
                <div className="h-3 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${Math.max(8, (day.plays / maxPlays) * 100)}%` }}
                  />
                </div>
                <span className="text-right">{day.plays}전 · {Math.floor((day.wins / Math.max(1, day.plays)) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 p-6 text-center text-sm font-bold text-gray-500">
          아직 누적 기록이 없습니다. 검색할수록 장기 분석이 채워집니다.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <BucketList title="자주 플레이한 모드" rows={currentHistory.topModes} translate={(name) => modeDict[name] ?? name} />
        <BucketList title="자주 플레이한 맵" rows={currentHistory.topMaps} translate={(name) => mapDict[name] ?? name} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-indigo-50 p-4">
      <p className="text-xs font-black text-indigo-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-indigo-800">{value}</p>
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
    <div className="rounded-2xl border border-indigo-100 bg-white p-4">
      <h4 className="mb-3 font-black text-indigo-900">{title}</h4>
      {rows.length ? (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.name} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
              <span className="min-w-0 truncate text-sm font-black text-gray-800">{translate(row.name)}</span>
              <span className="shrink-0 text-xs font-bold text-indigo-600">
                {row.winRate}% · {row.plays}전 · {row.trophyDelta > 0 ? "+" : ""}{row.trophyDelta}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm font-bold text-gray-400">데이터가 없습니다.</p>
      )}
    </div>
  );
}
