export const locales = ["ko", "en", "ja"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ko";
export const localizedLocales = ["en", "ja"] as const;

export const localeLabels: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
};

export const numberLocales: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
};

export const localizedCorePaths = new Set([
  "/",
  "/meta",
  "/teams",
  "/counters",
  "/rankings",
  "/status",
]);

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function isLocalizedLocale(value: string): value is "en" | "ja" {
  return value === "en" || value === "ja";
}

export function stripLocalePrefix(pathname: string) {
  const match = pathname.match(/^\/(en|ja)(?=\/|$)/);
  if (!match) return pathname || "/";
  const stripped = pathname.slice(match[0].length);
  return stripped ? `/${stripped.replace(/^\//, "")}` : "/";
}

export function localizedHref(locale: Locale, pathname: string) {
  const basePath = stripLocalePrefix(pathname);
  if (locale === "ko") return basePath;
  if (!localizedCorePaths.has(basePath)) return basePath;
  return basePath === "/" ? `/${locale}` : `/${locale}${basePath}`;
}

export function localeAlternates(pathname: string) {
  const basePath = stripLocalePrefix(pathname);
  return {
    "ko-KR": basePath,
    en: localizedHref("en", basePath),
    ja: localizedHref("ja", basePath),
  };
}
