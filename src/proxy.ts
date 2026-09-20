import { NextResponse, type NextRequest } from "next/server";

const localeCookie = "brawl-locale";

function preferredLocale(request: NextRequest) {
  const saved = request.cookies.get(localeCookie)?.value;
  if (saved === "en" || saved === "ja" || saved === "ko") return saved;

  const acceptLanguage = request.headers.get("accept-language")?.toLowerCase() ?? "";
  const ordered = acceptLanguage
    .split(",")
    .map((entry) => {
      const [tag, qPart] = entry.trim().split(";");
      const q = qPart?.startsWith("q=") ? Number(qPart.slice(2)) : 1;
      return { tag, q: Number.isFinite(q) ? q : 0 };
    })
    .sort((left, right) => right.q - left.q);

  for (const entry of ordered) {
    if (entry.tag === "ja" || entry.tag.startsWith("ja-")) return "ja";
    if (entry.tag === "en" || entry.tag.startsWith("en-")) return "en";
    if (entry.tag === "ko" || entry.tag.startsWith("ko-")) return "ko";
  }

  return "ko";
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
