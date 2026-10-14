import type { Metadata } from "next";
import { localizedHref, type Locale } from "../i18n/config";
import { getLocalizedSiteSeo } from "../i18n/seo";

/** Provide unique, truthful snippets for catalog detail pages in every locale. */
export function detailSeoDescription(name: string, details: string, fallback: string) {
  const meaningfulDetails = details.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const meaningfulName = name.replace(/\s+/g, " ").trim();
  const base = meaningfulDetails || fallback.trim();
  const description = base.toLocaleLowerCase().includes(meaningfulName.toLocaleLowerCase())
    ? base
    : `${meaningfulName}: ${base}`;
  return description.length > 180 ? `${description.slice(0, 179).trimEnd()}…` : description;
}

export function detailSocialMetadata(
  locale: Locale,
  title: string,
  description: string,
  pathname: string,
): Pick<Metadata, "description" | "openGraph" | "twitter"> {
  return {
    description,
    openGraph: {
      title: `${title} | Brawloop`,
      description,
      url: localizedHref(locale, pathname),
      siteName: "Brawloop",
      locale: locale === "ko" ? "ko_KR" : getLocalizedSiteSeo(locale).openGraphLocale,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${title} | Brawloop`,
      description,
    },
  };
}
