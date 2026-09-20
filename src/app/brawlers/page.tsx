import type { Metadata } from "next";
import Link from "next/link";
import BrawlImage from "../../components/BrawlImage";
import PortalLayout, { StatPill } from "../../components/PortalLayout";
import { localeAlternates, localizedHref, type Locale } from "../../i18n/config";
import { getCatalogPageMessages } from "../../i18n/catalogPageMessages";
import { getBrawlifyBrawlers } from "../../server/brawlify";
import {
  translateBrawlerClassName,
  translateBrawlerDescription,
  translateBrawlerName,
  translateRarityName,
} from "../../utils/brawlTranslations";
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {released.map((brawler) => {
          const displayName = translateBrawlerName(brawler.name, locale);
          const description = translateBrawlerDescription(brawler.name, brawler.description, locale);

          return (
          <article key={brawler.id} className="rounded-lg border border-white bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <BrawlImage
                src={brawler.imageUrl2 ?? brawler.imageUrl ?? `https://cdn.brawlify.com/brawlers/borders/${brawler.id}.png`}
                alt={displayName}
                width={72}
                height={72}
                className="h-16 w-16 shrink-0 rounded-md bg-indigo-50 object-contain"
                fallbackText={displayName.slice(0, 1)}
              />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black text-gray-900">
                  {displayName}
                </h2>
                <p className="text-xs font-bold text-indigo-600">{translateRarityName(brawler.rarity?.name, locale) || copy.list.unknown}</p>
                <p className="text-xs font-bold text-gray-400">{translateBrawlerClassName(brawler.class?.name, locale) || "-"}</p>
              </div>
            </div>
            <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-gray-500">
              {description || copy.list.noDescription}
            </p>
            <Link
              href={localizedHref(locale, `/brawlers/${brawler.id}`)}
              className="mt-4 inline-block rounded-full bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              {copy.list.detailView}
            </Link>
          </article>
          );
        })}
      </section>
    </PortalLayout>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-black text-white shadow-sm transition-colors hover:bg-indigo-700">
      {children}
    </Link>
  );
}
