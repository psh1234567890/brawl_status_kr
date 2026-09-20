import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortalLayout from "../../../components/PortalLayout";
import RankingsBrowser from "../../../components/RankingsBrowser";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getMessages } from "../../../i18n/messages";
import { getBrawlifyBrawlers } from "../../../server/brawlify";

export async function generateMetadata({ params }: PageProps<"/[lang]/rankings">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getMessages(lang).rankings;

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: `/${lang}/rankings`,
      languages: localeAlternates("/rankings"),
    },
  };
}

export default async function LocalizedRankingsPage({ params }: PageProps<"/[lang]/rankings">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getMessages(lang).rankings;
  const brawlers = (await getBrawlifyBrawlers().catch(() => ({ list: [] }))).list;

  return (
    <PortalLayout
      locale={lang}
      title={copy.title}
      eyebrow={copy.eyebrow}
      description={copy.description}
    >
      <RankingsBrowser brawlers={brawlers} locale={lang} />
    </PortalLayout>
  );
}
