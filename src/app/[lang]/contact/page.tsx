import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactPageContent } from "../../contact/page";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getDocumentPageMessages } from "../../../i18n/documentPageMessages";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getDocumentPageMessages(lang).contact.metadata;
  return { title: copy.title, description: copy.description, alternates: { canonical: `/${lang}/contact`, languages: localeAlternates("/contact") } };
}

export default async function LocalizedContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <ContactPageContent locale={lang} />;
}
