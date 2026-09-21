"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  localeLabels,
  localizedCorePaths,
  localizedHref,
  stripLocalePrefix,
  type Locale,
} from "../i18n/config";
import { getMessages } from "../i18n/messages";

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const copy = getMessages(locale).common;

  function changeLocale(nextLocale: Locale) {
    document.cookie = `brawl-locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const currentPath = stripLocalePrefix(pathname || "/");
    const targetPath =
      nextLocale !== "ko" && !localizedCorePaths.has(currentPath)
        ? `/${nextLocale}`
        : localizedHref(nextLocale, currentPath);
    const target = `${targetPath}${window.location.search}${window.location.hash}`;
    router.push(target);
  }

  return (
    <label className="inline-flex items-center gap-2 text-xs font-black text-slate-500">
      <span className="sr-only">{copy.language}</span>
      <select
        aria-label={copy.language}
        value={locale}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm outline-none transition-colors hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        {(Object.keys(localeLabels) as Locale[]).map((value) => (
          <option key={value} value={value}>
            {localeLabels[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
