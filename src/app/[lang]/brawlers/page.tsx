import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrawlersPageContent } from "../../brawlers/page";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getCatalogPageMessages } from "../../../i18n/catalogPageMessages";

export async function generateMetadata({ params }: PageProps<"/[lang]/brawlers">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getCatalogPageMessages(lang).brawlers.metadata;
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: `/${lang}/brawlers`, languages: localeAlternates("/brawlers") },
  };
}

export default async function LocalizedBrawlersPage({ params }: PageProps<"/[lang]/brawlers">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <BrawlersPageContent locale={lang} />;
}
