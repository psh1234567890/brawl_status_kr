import type { Metadata } from "next";
import Link from "next/link";
import BrawlersBrowser from "../../components/BrawlersBrowser";
import PortalLayout, { StatPill } from "../../components/PortalLayout";
import { localeAlternates, localizedHref, type Locale } from "../../i18n/config";
import { getCatalogPageMessages } from "../../i18n/catalogPageMessages";
import { getBrawlifyBrawlers } from "../../server/brawlify";
import { selectIndexableBrawlers } from "../../utils/seoIndexing";

const koCopy = getCatalogPageMessages("ko").brawlers;

export const metadata: Metadata = {
  title: koCopy.metadata.title,
  description: koCopy.metadata.description,
  alternates: { canonical: "/brawlers", languages: localeAlternates("/brawlers") },
};

export default async function BrawlersPage() {
  return <BrawlersPageContent locale="ko" />;
}

export async function BrawlersPageContent({ locale }: { locale: Locale }) {
  const copy = getCatalogPageMessages(locale).brawlers;
  const brawlers = (await getBrawlifyBrawlers().catch(() => ({ list: [] }))).list;
  const released = selectIndexableBrawlers(brawlers);
  const rarities = new Set(brawlers.map((brawler) => brawler.rarity?.name).filter(Boolean));

  return (
    <PortalLayout
      locale={locale}
      title={copy.list.title}
      eyebrow={copy.list.eyebrow}
      description={copy.list.description}
      actions={<LinkButton href={localizedHref(locale, "/")}>{copy.list.action}</LinkButton>}
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <StatPill label={copy.list.totalBrawlers} value={brawlers.length} />
        <StatPill label={copy.list.releasedBrawlers} value={released.length} />
        <StatPill label={copy.list.rarityCount} value={rarities.size} />
      </section>

      <BrawlersBrowser
        locale={locale}
        brawlers={released.map((brawler) => ({
          id: brawler.id,
          name: brawler.name,
          imageUrl: brawler.imageUrl2 ?? brawler.imageUrl,
          description: brawler.description,
          rarityName: brawler.rarity?.name,
          className: brawler.class?.name,
        }))}
      />
    </PortalLayout>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700">
      {children}
    </Link>
  );
}
