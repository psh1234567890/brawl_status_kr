import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CounterBrowser from "../../../components/CounterBrowser";
import PortalLayout from "../../../components/PortalLayout";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getMessages } from "../../../i18n/messages";
import { getBrawlifyBrawlers } from "../../../server/brawlify";

export async function generateMetadata({ params }: PageProps<"/[lang]/counters">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getMessages(lang).counters;

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: `/${lang}/counters`,
      languages: localeAlternates("/counters"),
    },
  };
}

export default async function LocalizedCountersPage({ params }: PageProps<"/[lang]/counters">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getMessages(lang).counters;
  const brawlers = (await getBrawlifyBrawlers().catch(() => ({ list: [] }))).list;

  return (
    <PortalLayout
      locale={lang}
      title={copy.title}
      eyebrow={copy.eyebrow}
      description={copy.description}
    >
      <CounterBrowser brawlers={brawlers} locale={lang} />
    </PortalLayout>
  );
}
