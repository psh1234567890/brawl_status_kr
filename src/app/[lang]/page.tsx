import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Home from "../page";
import {
  isLocalizedLocale,
  localeAlternates,
} from "../../i18n/config";
import { getLocalizedSiteSeo } from "../../i18n/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const { title, description, openGraphLocale } = getLocalizedSiteSeo(lang);

  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}`,
      languages: localeAlternates("/"),
    },
    openGraph: {
      title: `${title} | Brawl Status KR`,
      description,
      url: `/${lang}`,
      siteName: "Brawl Status KR",
      locale: openGraphLocale,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${title} | Brawl Status KR`,
      description,
    },
  };
}

export default async function LocalizedHomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <Home locale={lang} />;
}
