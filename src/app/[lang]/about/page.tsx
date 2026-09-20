import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AboutPageContent } from "../../about/page";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getDocumentPageMessages } from "../../../i18n/documentPageMessages";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getDocumentPageMessages(lang).about.metadata;
  return { title: copy.title, description: copy.description, alternates: { canonical: `/${lang}/about`, languages: localeAlternates("/about") } };
}

export default async function LocalizedAboutPage({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <AboutPageContent locale={lang} />;
}
