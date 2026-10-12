"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import { localizedHref, type Locale } from "../i18n/config";
import { getMessages } from "../i18n/messages";
import { compareNavLabels } from "../i18n/playerComparisonMessages";
import { isActiveNavigationItem } from "../utils/navigation";

const menuLabels: Record<Locale, string> = {
  ko: "전체 메뉴", en: "Menu", ja: "メニュー", "pt-br": "Menu",
  es: "Menú", tr: "Menü", de: "Menü", fr: "Menu", it: "Menu", ru: "Меню",
};

/** Keep the mobile header one row high; secondary destinations live here. */
export default function MobileHeaderMenu({ locale }: { locale: Locale }) {
  const details = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const copy = getMessages(locale).common;
  const links = [
    ["/", copy.home],
    ["/compare", compareNavLabels[locale]],
    ["/meta", copy.meta],
    ["/events", copy.events],
    ["/minigames", copy.minigames],
    ["/brawlers", copy.brawlers],
    ["/maps", copy.maps],
    ["/gamemodes", copy.modes],
    ["/skins", copy.skins],
    ["/rankings", copy.rankings],
    ["/clubs", copy.clubs],
    ["/teams", copy.teams],
    ["/counters", copy.counters],
    ["/status", copy.status],
  ] as const;

  return (
    <details ref={details} className="group relative md:hidden">
      <summary
        aria-label={menuLabels[locale]}
        className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-[min(19rem,calc(100vw-2rem))] max-h-[75dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
        <nav aria-label={copy.mainNavigation} className="grid grid-cols-2 gap-1">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={localizedHref(locale, href)}
              aria-current={isActiveNavigationItem(pathname, href) ? "page" : undefined}
              onClick={() => { if (details.current) details.current.open = false; }}
              className="flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-slate-700 hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-blue-600 aria-[current=page]:bg-blue-700 aria-[current=page]:text-white aria-[current=page]:hover:bg-blue-800 aria-[current=page]:focus-visible:bg-blue-800"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-3 border-t border-slate-100 pt-3">
          <LanguageSwitcher locale={locale} />
        </div>
      </div>
    </details>
  );
}
