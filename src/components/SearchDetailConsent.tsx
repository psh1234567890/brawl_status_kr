"use client";

import { useState } from "react";
import type { Locale } from "../i18n/config";
import { searchDetailConsentMessages } from "../i18n/searchDetailConsentMessages";

const cookieName = "brawl_search_detail_consent";

export default function SearchDetailConsent({ locale }: { locale: Locale }) {
  const copy = searchDetailConsentMessages[locale];
  const [enabled, setEnabled] = useState(() =>
    typeof document !== "undefined" &&
    /(?:^|;\\s*)brawl_search_detail_consent=1(?:;|$)/.test(document.cookie)
  );

  function setConsent(checked: boolean) {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = checked
      ? `${cookieName}=1; Path=/; Max-Age=604800; SameSite=Lax${secure}`
      : `${cookieName}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    setEnabled(checked);
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={enabled} onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-blue-600" />
        <span className="text-sm font-bold text-slate-800">{copy.title}</span>
      </label>
      <p className="mt-2 text-xs leading-5 text-slate-600">{copy.notice}</p>
    </div>
  );
}
