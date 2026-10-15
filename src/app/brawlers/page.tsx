import type { Metadata } from "next";
import Link from "next/link";
import BrawlersBrowser from "../../components/BrawlersBrowser";
import PortalLayout, { StatPill } from "../../components/PortalLayout";
import { localeAlternates, localizedHref, type Locale } from "../../i18n/config";
import { getCatalogPageMessages } from "../../i18n/catalogPageMessages";
import { getBrawlifyBrawlers } from "../../server/brawlify";
import { selectIndexableBrawlers } from "../../utils/seoIndexing";
import { brawlerGuideMessages } from "../../i18n/brawlerGuideMessages";

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
  const guide = brawlerGuideMessages[locale];
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
        <StatPill label={copy.list.totalBrawlers} value={brawlers.length} icon="players" />
        <StatPill label={copy.list.releasedBrawlers} value={released.length} icon="win" />
        <StatPill label={copy.list.rarityCount} value={rarities.size} icon="star" />
      </section>

      <BrawlersBrowser
        locale={locale}
        brawlers={released.map((brawler) => ({
          id: brawler.id,
          name: brawler.name,
          imageUrl: brawler.imageUrl,
          imageUrl2: brawler.imageUrl2,
          avatarId: brawler.avatarId,
          description: brawler.description,
          rarityName: brawler.rarity?.name,
          className: brawler.class?.name,
        }))}
      />
      <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="brawler-guide-title">
        <h2 id="brawler-guide-title" className="text-lg font-black">{guide.title}</h2>
        <div className="mt-3 divide-y divide-slate-100">
          {guide.questions.map(([question, answer]) => <details key={question} className="py-3">
            <summary className="cursor-pointer text-sm font-bold text-slate-800">{question}</summary>
            <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
          </details>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm font-bold text-blue-700">
          <Link href={localizedHref(locale, "/")} className="inline-flex min-h-11 items-center underline">{guide.search}</Link>
          <Link href={localizedHref(locale, "/meta")} className="inline-flex min-h-11 items-center underline">{guide.meta}</Link>
        </div>
      </section>
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
