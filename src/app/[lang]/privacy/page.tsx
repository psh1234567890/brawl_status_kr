import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrivacyPageContent } from "../../privacy/page";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getDocumentPageMessages } from "../../../i18n/documentPageMessages";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getDocumentPageMessages(lang).privacy.metadata;
  return { title: copy.title, description: copy.description, alternates: { canonical: `/${lang}/privacy`, languages: localeAlternates("/privacy") } };
}

export default async function LocalizedPrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <PrivacyPageContent locale={lang} />;
}
