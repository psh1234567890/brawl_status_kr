import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MethodologyPageContent } from "../../methodology/page";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getDocumentPageMessages } from "../../../i18n/documentPageMessages";

export async function generateMetadata({ params }: PageProps<"/[lang]/methodology">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getDocumentPageMessages(lang).methodology.metadata;
  return { title: copy.title, description: copy.description, alternates: { canonical: `/${lang}/methodology`, languages: localeAlternates("/methodology") } };
}

export default async function LocalizedMethodologyPage({ params }: PageProps<"/[lang]/methodology">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <MethodologyPageContent locale={lang} />;
}
