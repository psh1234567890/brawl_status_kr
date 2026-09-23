import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrawlImage from "../../../components/BrawlImage";
import PortalLayout, { StatPill } from "../../../components/PortalLayout";
import { localeAlternates, localizedHref, type Locale } from "../../../i18n/config";
import { getCatalogPageMessages } from "../../../i18n/catalogPageMessages";
import { getBrawlifyBrawlers } from "../../../server/brawlify";
import {
  translateAbilityName,
  translateBrawlerClassName,
  translateBrawlerDescription,
  translateBrawlerName,
  translateRarityName,
} from "../../../utils/brawlTranslations";
import { selectIndexableBrawlers } from "../../../utils/seoIndexing";

interface BrawlerDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BrawlerDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return getBrawlerDetailMetadata(id, "ko");
}

export async function getBrawlerDetailMetadata(id: string, locale: Locale): Promise<Metadata> {
  const copy = getCatalogPageMessages(locale).brawlers;
  const brawlers = (await getBrawlifyBrawlers().catch(() => ({ list: [] }))).list;
  const brawler = brawlers.find((item) => String(item.id) === id);
  const name = brawler ? translateBrawlerName(brawler.name, locale) : copy.metadata.detailNameFallback;
  const shouldIndex = brawler
    ? selectIndexableBrawlers(brawlers).some((item) => item.id === brawler.id)
    : false;

  const basePath = `/brawlers/${id}`;
  return {
    title: `${name}${copy.metadata.detailTitleSuffix}`,
    alternates: {
      canonical: localizedHref(locale, basePath),
      languages: localeAlternates(basePath),
    },
    robots: shouldIndex ? undefined : { index: false, follow: true },
  };
}

export default async function BrawlerDetailPage({ params }: BrawlerDetailPageProps) {
  const { id } = await params;
  return <BrawlerDetailPageContent id={id} locale="ko" />;
}

export async function BrawlerDetailPageContent({ id, locale }: { id: string; locale: Locale }) {
  const copy = getCatalogPageMessages(locale).brawlers;
  const brawler = (await getBrawlifyBrawlers().catch(() => ({ list: [] }))).list.find((item) => String(item.id) === id);
  if (!brawler) notFound();

  const displayName = translateBrawlerName(brawler.name, locale);
  const description = translateBrawlerDescription(brawler.name, brawler.description, locale);

  return (
    <PortalLayout
      locale={locale}
      title={displayName}
      eyebrow={`${translateRarityName(brawler.rarity?.name, locale) || copy.detail.unknown} · ${translateBrawlerClassName(brawler.class?.name, locale) || copy.detail.role}`}
      description={description || copy.detail.descriptionFallback}
      actions={<LinkButton href={localizedHref(locale, "/")}>{copy.detail.action}</LinkButton>}
    >
      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <BrawlImage
          src={brawler.imageUrl2 ?? brawler.imageUrl ?? `https://cdn.brawlify.com/brawlers/borders/${brawler.id}.png`}
          alt={displayName}
          width={320}
          height={320}
          className="h-80 w-full rounded-lg border border-slate-200 bg-white object-contain p-6 shadow-sm"
          fallbackText={displayName.slice(0, 1)}
        />
        <div className="grid content-start gap-3 sm:grid-cols-2">
          <StatPill label={copy.detail.brawlerId} value={brawler.id} />
          <StatPill label={copy.detail.rarity} value={translateRarityName(brawler.rarity?.name, locale) || "-"} />
          <StatPill label={copy.detail.className} value={translateBrawlerClassName(brawler.class?.name, locale) || "-"} />
          <StatPill label={copy.detail.releaseStatus} value={brawler.released === false ? copy.detail.unreleased : copy.detail.released} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AbilityPanel title={copy.detail.gadgets} items={brawler.gadgets ?? []} imageType="gadgets" locale={locale} emptyText={copy.detail.noData} />
        <AbilityPanel title={copy.detail.starPowers} items={brawler.starPowers ?? []} imageType="star-powers" locale={locale} emptyText={copy.detail.noData} />
      </section>
    </PortalLayout>
  );
}

function AbilityPanel({
  title,
  items,
  imageType,
  locale,
  emptyText,
}: {
  title: string;
  items: { id: number; name: string }[];
  imageType: string;
  locale: Locale;
  emptyText: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-black text-blue-950">{title}</h2>
      {items.length ? (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const displayName = translateAbilityName(item.id, item.name, locale);

            return (
            <div key={item.id} className="flex items-center gap-3 rounded-lg bg-blue-50 p-3">
              <BrawlImage
                src={`https://cdn.brawlify.com/${imageType}/regular/${item.id}.png`}
                alt={displayName}
                width={40}
                height={40}
                className="h-10 w-10 rounded-md"
                fallbackText={title.slice(0, 1)}
              />
              <span className="font-black text-slate-800">{displayName}</span>
            </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm font-bold text-slate-400">{emptyText}</p>
      )}
    </section>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700">
      {children}
    </Link>
  );
}
