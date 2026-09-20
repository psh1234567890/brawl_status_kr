import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapsPageContent } from "../../maps/page";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getCatalogPageMessages } from "../../../i18n/catalogPageMessages";

export async function generateMetadata({ params }: PageProps<"/[lang]/maps">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getCatalogPageMessages(lang).maps.metadata;
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: `/${lang}/maps`, languages: localeAlternates("/maps") },
  };
}

export default async function LocalizedMapsPage({ params }: PageProps<"/[lang]/maps">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <MapsPageContent locale={lang} />;
}
