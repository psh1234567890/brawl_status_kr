export const locales = [
  "ko",
  "en",
  "ja",
  "pt-br",
  "es",
  "tr",
  "de",
  "fr",
  "it",
  "ru",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ko";
export const localizedLocales = [
  "en",
  "ja",
  "pt-br",
  "es",
  "tr",
  "de",
  "fr",
  "it",
  "ru",
] as const;

export type LocalizedLocale = (typeof localizedLocales)[number];

export const localeLabels: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  "pt-br": "Português (Brasil)",
  es: "Español",
  tr: "Türkçe",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  ru: "Русский",
};

export const numberLocales: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  "pt-br": "pt-BR",
  es: "es-ES",
  tr: "tr-TR",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  ru: "ru-RU",
};

export const hreflangByLocale: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en",
  ja: "ja",
  "pt-br": "pt-BR",
  es: "es",
  tr: "tr",
  de: "de",
  fr: "fr",
  it: "it",
  ru: "ru",
};

export const localizedCorePaths = new Set([
  "/",
  "/meta",
  "/teams",
  "/counters",
  "/rankings",
  "/status",
  "/maps",
  "/brawlers",
  "/minigames",
  "/minigames/brawler-quiz",
  "/gamemodes",
  "/events",
  "/skins",
  "/clubs",
  "/about",
  "/methodology",
  "/privacy",
  "/terms",
  "/contact",
]);

const localizedDynamicPrefixes = ["/maps/", "/brawlers/", "/gamemodes/"] as const;

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function isLocalizedLocale(value: string): value is LocalizedLocale {
  return localizedLocales.includes(value as LocalizedLocale);
}

export function stripLocalePrefix(pathname: string) {
  const normalized = pathname || "/";
  const [firstSegment] = normalized.replace(/^\//, "").split("/");
  if (!isLocalizedLocale(firstSegment)) return normalized;
  const prefix = `/${firstSegment}`;
  const stripped = normalized.slice(prefix.length);
  return stripped ? `/${stripped.replace(/^\//, "")}` : "/";
}

export function localizedHref(locale: Locale, pathname: string) {
  const basePath = stripLocalePrefix(pathname);
  if (locale === "ko") return basePath;
  if (!isLocalizedPath(basePath)) return basePath;
  return basePath === "/" ? `/${locale}` : `/${locale}${basePath}`;
}

export function isLocalizedPath(pathname: string) {
  const basePath = stripLocalePrefix(pathname);
  return (
    localizedCorePaths.has(basePath) ||
    localizedDynamicPrefixes.some((prefix) => basePath.startsWith(prefix))
  );
}

export function localeAlternates(pathname: string) {
  const basePath = stripLocalePrefix(pathname);
  return Object.fromEntries(
    locales.map((locale) => [hreflangByLocale[locale], localizedHref(locale, basePath)]),
  );
}
