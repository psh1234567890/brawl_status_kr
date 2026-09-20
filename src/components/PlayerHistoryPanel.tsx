"use client";

import { useMemo } from "react";
import type { Locale } from "../i18n/config";
import { getComponentMessages } from "../i18n/componentMessages";
import { formatBattles, formatDays } from "../i18n/formatters";
import type { PlayerHistoryResponse } from "../types/brawl";
import { translateMapName, translateModeName } from "../utils/brawlTranslations";

interface PlayerHistoryPanelProps {
  history: PlayerHistoryResponse | null;
  locale?: Locale;
}

export default function PlayerHistoryPanel({ history, locale = "ko" }: PlayerHistoryPanelProps) {
  const copy = getComponentMessages(locale).history;
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
        <Metric label={copy.totalBattles} value={formatBattles(locale, history.totalTrackedGames)} />
        <Metric label={copy.trackedDays} value={formatDays(locale, history.trackedDays)} />
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
                <span className="text-right">{formatBattles(locale, day.plays)} · {Math.floor((day.wins / Math.max(1, day.plays)) * 100)}%</span>
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
  const copy = getComponentMessages(locale).history;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-black text-slate-950">{title}</h3>
      {rows.length ? (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.name} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
              <span className="min-w-0 truncate text-sm font-black text-slate-800">{translate(row.name)}</span>
              <span className="shrink-0 text-xs font-bold text-blue-700">
                {row.winRate}% · {formatBattles(locale, row.plays)} · {row.trophyDelta > 0 ? "+" : ""}{row.trophyDelta}
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
