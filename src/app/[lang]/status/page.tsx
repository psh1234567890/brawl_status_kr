import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatusPageContent } from "../../status/page";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getMessages } from "../../../i18n/messages";

export async function generateMetadata({ params }: PageProps<"/[lang]/status">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getMessages(lang).status;

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: `/${lang}/status`,
      languages: localeAlternates("/status"),
    },
  };
}

export default async function LocalizedStatusPage({ params }: PageProps<"/[lang]/status">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <StatusPageContent locale={lang} />;
}
