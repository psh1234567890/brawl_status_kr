"use client";

import { useSyncExternalStore } from "react";
import type { Locale } from "../i18n/config";
import { analyticsOptOutMessages } from "../i18n/analyticsOptOutMessages";
import { BROWSER_ACTIVITY_KEY } from "../utils/usageEvents";
import { PRODUCT_SESSION_KEY } from "../utils/productFunnel";

const COOKIE_NAME = "brawl_analytics_opt_out";
const OPT_OUT_CHANGE_EVENT = "brawl:analytics-optout-changed";

function readCookie() {
  return /(?:^|;\s*)brawl_analytics_opt_out=1(?:;|$)/.test(document.cookie);
}

function subscribe(listener: () => void) {
  window.addEventListener(OPT_OUT_CHANGE_EVENT, listener);
  return () => window.removeEventListener(OPT_OUT_CHANGE_EVENT, listener);
}

export default function AnalyticsOptOutControl({ locale }: { locale: Locale }) {
  const copy = analyticsOptOutMessages[locale];
  const excluded = useSyncExternalStore(subscribe, readCookie, () => false);

  function updateExcluded(checked: boolean) {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = checked
      ? `${COOKIE_NAME}=1; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
      : `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    window.dispatchEvent(new Event(OPT_OUT_CHANGE_EVENT));
    if (checked) { try {
      localStorage.removeItem(BROWSER_ACTIVITY_KEY);
      localStorage.removeItem(PRODUCT_SESSION_KEY);
    } catch { /* Optional storage. */ } }
  }

  return (
    <section aria-label={copy.title} className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-lg font-black text-indigo-900">{copy.title}</h2>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-bold text-slate-800">
        <input
          type="checkbox"
          checked={excluded}
          onChange={(event) => updateExcluded(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
        />
        <span>{copy.label}</span>
      </label>
      <p className="mt-3 text-sm leading-6 text-slate-600">{copy.description}</p>
      <p role="status" className="mt-2 text-sm font-semibold text-indigo-800">
        {excluded ? copy.active : copy.inactive}
      </p>
    </section>
  );
}
