import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TermsPageContent } from "../../terms/page";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getDocumentPageMessages } from "../../../i18n/documentPageMessages";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getDocumentPageMessages(lang).terms.metadata;
  return { title: copy.title, description: copy.description, alternates: { canonical: `/${lang}/terms`, languages: localeAlternates("/terms") } };
}

export default async function LocalizedTermsPage({ params }: PageProps<"/[lang]/terms">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <TermsPageContent locale={lang} />;
}
