import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventsPageContent } from "../../events/page";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getCatalogPageMessages } from "../../../i18n/catalogPageMessages";

export async function generateMetadata({ params }: PageProps<"/[lang]/events">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getCatalogPageMessages(lang).events.metadata;
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: `/${lang}/events`, languages: localeAlternates("/events") },
  };
}

export default async function LocalizedEventsPage({ params }: PageProps<"/[lang]/events">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <EventsPageContent locale={lang} />;
}
