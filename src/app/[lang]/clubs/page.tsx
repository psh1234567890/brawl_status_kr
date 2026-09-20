import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClubsPageContent } from "../../clubs/page";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getCatalogPageMessages } from "../../../i18n/catalogPageMessages";

export async function generateMetadata({ params }: PageProps<"/[lang]/clubs">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getCatalogPageMessages(lang).clubs.metadata;
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: `/${lang}/clubs`, languages: localeAlternates("/clubs") },
  };
}

export default async function LocalizedClubsPage({ params }: PageProps<"/[lang]/clubs">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <ClubsPageContent locale={lang} />;
}
