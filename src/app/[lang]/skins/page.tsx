import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SkinCatalogPage from "../../skins/page";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getCatalogPageMessages } from "../../../i18n/catalogPageMessages";

export async function generateMetadata({ params }: PageProps<"/[lang]/skins">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getCatalogPageMessages(lang).skins.metadata;
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: `/${lang}/skins`, languages: localeAlternates("/skins") },
  };
}

export default async function LocalizedSkinsPage({ params }: PageProps<"/[lang]/skins">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <SkinCatalogPage locale={lang} />;
}
