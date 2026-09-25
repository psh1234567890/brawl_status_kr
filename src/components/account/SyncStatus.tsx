"use client";

import type { Locale } from "../../i18n/config";
import { getAccountMessages } from "../../i18n/accountMessages";
import type { AccountSnapshot } from "../../hooks/useAccount";

export default function SyncStatus({
  locale,
  state,
  pendingCount,
  onRetry,
}: {
  locale: Locale;
  state: AccountSnapshot["syncState"];
  pendingCount: number;
  onRetry?: () => void;
}) {
  const copy = getAccountMessages(locale);
  const label = copy.sync[state];
  return (
    <div className="flex flex-wrap items-center gap-2" aria-live="polite" aria-atomic="true">
      <span className={`inline-flex min-h-8 items-center rounded-full px-3 py-1 text-xs font-black ${state === "synced" ? "bg-emerald-100 text-emerald-800" : state === "failed" || state === "blocked" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>
        {label}
      </span>
      {pendingCount > 0 ? <span className="text-xs font-bold text-slate-500">{copy.pendingCount.replace("{count}", String(pendingCount))}</span> : null}
      {onRetry && (state === "failed" || state === "blocked" || state === "pending" || state === "offline" || state === "loginRequired") ? (
        <button type="button" onClick={onRetry} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">
          {copy.retrySync}
        </button>
      ) : null}
    </div>
  );
}
