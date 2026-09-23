import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrawlImage from "../../../components/BrawlImage";
import PortalLayout, { StatPill } from "../../../components/PortalLayout";
import {
  localeAlternates,
  localizedHref,
  numberLocales,
  type Locale,
} from "../../../i18n/config";
import { getCatalogPageMessages } from "../../../i18n/catalogPageMessages";
import { getBrawlifyMaps } from "../../../server/brawlify";
import { translateMapName, translateModeName } from "../../../utils/brawlTranslations";
import { isIndexableMap, selectIndexableMaps } from "../../../utils/seoIndexing";

interface MapDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: MapDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return getMapDetailMetadata(id, "ko");
}

export async function getMapDetailMetadata(id: string, locale: Locale): Promise<Metadata> {
  const copy = getCatalogPageMessages(locale).maps;
  const maps = (await getBrawlifyMaps().catch(() => ({ list: [] }))).list;
  const map = maps.find((item) => String(item.id) === id);
  const shouldIndex = map ? isIndexableMap(map, maps) : false;
  const basePath = `/maps/${id}`;

  return {
    title: map
      ? `${translateMapName(map.name, locale)}${copy.metadata.detailTitleSuffix}`
      : copy.metadata.detailFallbackTitle,
    alternates: {
      canonical: localizedHref(locale, basePath),
      languages: localeAlternates(basePath),
    },
    robots: shouldIndex ? undefined : { index: false, follow: true },
  };
}

export default async function MapDetailPage({ params }: MapDetailPageProps) {
  const { id } = await params;
  return <MapDetailPageContent id={id} locale="ko" />;
}

export async function MapDetailPageContent({ id, locale }: { id: string; locale: Locale }) {
  const copy = getCatalogPageMessages(locale).maps;
  const maps = (await getBrawlifyMaps().catch(() => ({ list: [] }))).list;
  const map = maps.find((item) => String(item.id) === id);
  if (!map) notFound();
  const displayName = translateMapName(map.name, locale);
  const displayMode = translateModeName(map.gameMode?.name, locale) || "-";

  const sameModeMaps = selectIndexableMaps(maps)
    .filter((item) => item.id !== map.id && item.gameMode?.name === map.gameMode?.name)
    .slice(0, 12);

  return (
    <PortalLayout
      locale={locale}
      title={displayName}
      eyebrow={displayMode}
      description={copy.detail.description}
      actions={<LinkButton href={localizedHref(locale, "/meta")}>{copy.detail.action}</LinkButton>}
    >
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {map.imageUrl ? (
            <BrawlImage
              src={map.imageUrl}
              alt={displayName}
              width={900}
              height={500}
              className="h-auto w-full object-cover"
              fallbackText={displayName.slice(0, 1)}
            />
          ) : (
            <div className="flex h-72 items-center justify-center bg-blue-50 text-5xl font-black text-blue-200">
              {displayName.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <StatPill label={copy.detail.mapId} value={map.id} />
          <StatPill label={copy.detail.gameMode} value={displayMode} />
          <StatPill label={copy.detail.environment} value={map.environment?.name ?? "-"} />
          <StatPill label={copy.detail.recentActive} value={formatUnixDate(map.lastActive, locale)} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black text-blue-950">{copy.detail.sameModeMaps}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sameModeMaps.map((item) => (
            <Link
              key={item.id}
              href={localizedHref(locale, `/maps/${item.id}`)}
              className="rounded-lg border border-slate-200 bg-white p-4 font-black text-slate-800 shadow-sm transition-transform hover:-translate-y-0.5"
            >
              {translateMapName(item.name, locale)}
            </Link>
          ))}
        </div>
      </section>
    </PortalLayout>
  );
}

function formatUnixDate(value: number | undefined, locale: Locale) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(numberLocales[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value * 1000));
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700">
      {children}
    </Link>
  );
}
