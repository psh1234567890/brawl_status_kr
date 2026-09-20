import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameModesPageContent } from "../../gamemodes/page";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getCatalogPageMessages } from "../../../i18n/catalogPageMessages";

export async function generateMetadata({ params }: PageProps<"/[lang]/gamemodes">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getCatalogPageMessages(lang).gamemodes.metadata;
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: `/${lang}/gamemodes`, languages: localeAlternates("/gamemodes") },
  };
}

export default async function LocalizedGameModesPage({ params }: PageProps<"/[lang]/gamemodes">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <GameModesPageContent locale={lang} />;
}
