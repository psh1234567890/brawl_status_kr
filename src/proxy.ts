import { NextResponse, type NextRequest } from "next/server";
import { isLocale, type Locale } from "./i18n/config";

const localeCookie = "brawl-locale";

function preferredLocale(request: NextRequest) {
  const saved = request.cookies.get(localeCookie)?.value;
  if (saved && isLocale(saved)) return saved;

  const acceptLanguage = request.headers.get("accept-language")?.toLowerCase() ?? "";
  if (!acceptLanguage.trim()) return "ko";
  const ordered = acceptLanguage
    .split(",")
    .map((entry) => {
      const [tag, qPart] = entry.trim().split(";");
      const q = qPart?.startsWith("q=") ? Number(qPart.slice(2)) : 1;
      return { tag, q: Number.isFinite(q) ? q : 0 };
    })
    .sort((left, right) => right.q - left.q);

  for (const entry of ordered) {
    const locale = mapLanguageTag(entry.tag);
    if (locale) return locale;
  }

  return "en";
}

function mapLanguageTag(tag: string): Locale | null {
  const base = tag.split("-")[0];
  if (base === "pt") return "pt-br";
  if (base === "ko") return "ko";
  if (base === "en") return "en";
  if (base === "ja") return "ja";
  if (base === "es") return "es";
  if (base === "tr") return "tr";
  if (base === "de") return "de";
  if (base === "fr") return "fr";
  if (base === "it") return "it";
  if (base === "ru") return "ru";
  return null;
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/") return NextResponse.next();

  const locale = preferredLocale(request);
  if (locale === "ko") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/"],
};
