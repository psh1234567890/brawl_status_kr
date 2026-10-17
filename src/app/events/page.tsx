import type { Metadata } from "next";
import PortalLayout from "../../components/PortalLayout";
import HomeCurrentMaps from "../../components/brand/HomeCurrentMaps";
import { localeAlternates, type Locale } from "../../i18n/config";
import { getCatalogPageMessages } from "../../i18n/catalogPageMessages";
import { eventRotationMessages } from "../../i18n/eventRotationMessages";

export const metadata: Metadata = {
  title: getCatalogPageMessages("ko").events.metadata.title,
  description: eventRotationMessages.ko.description,
  alternates: { canonical: "/events", languages: localeAlternates("/events") },
};

export default function EventsPage() {
  return <EventsPageContent locale="ko" />;
}

export function EventsPageContent({ locale }: { locale: Locale }) {
  const copy = getCatalogPageMessages(locale).events;
  return <PortalLayout locale={locale} title={copy.title} eyebrow={copy.eyebrow} description={eventRotationMessages[locale].description}>
    <HomeCurrentMaps locale={locale} expanded />
  </PortalLayout>;
}
