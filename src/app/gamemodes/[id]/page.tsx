import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrawlImage from "../../../components/BrawlImage";
import PortalLayout, { StatPill } from "../../../components/PortalLayout";
import { localeAlternates, localizedHref, type Locale } from "../../../i18n/config";
import { getCatalogPageMessages } from "../../../i18n/catalogPageMessages";
import { getBrawlifyGameModes, getBrawlifyMaps } from "../../../server/brawlify";
import {
  translateMapName,
  translateModeDescription,
  translateModeName,
} from "../../../utils/brawlTranslations";
import {
  selectIndexableGameModes,
  selectIndexableMaps,
} from "../../../utils/seoIndexing";

interface GameModeDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: GameModeDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return getGameModeDetailMetadata(id, "ko");
}

export async function getGameModeDetailMetadata(id: string, locale: Locale): Promise<Metadata> {
  const copy = getCatalogPageMessages(locale).gamemodes;
  const modes = (await getBrawlifyGameModes().catch(() => ({ list: [] }))).list;
  const mode = modes.find((item) => String(item.id) === id);
  const shouldIndex = mode
    ? selectIndexableGameModes(modes).some((item) => item.id === mode.id)
    : false;

  const basePath = `/gamemodes/${id}`;
  return {
    title: mode
      ? `${translateModeName(mode.name, locale)}${copy.metadata.detailTitleSuffix}`
      : copy.metadata.detailFallbackTitle,
    alternates: {
      canonical: localizedHref(locale, basePath),
      languages: localeAlternates(basePath),
    },
    robots: shouldIndex ? undefined : { index: false, follow: true },
  };
}

export default async function GameModeDetailPage({ params }: GameModeDetailPageProps) {
  const { id } = await params;
  return <GameModeDetailPageContent id={id} locale="ko" />;
}

export async function GameModeDetailPageContent({ id, locale }: { id: string; locale: Locale }) {
  const copy = getCatalogPageMessages(locale).gamemodes;
  const [modes, maps] = await Promise.all([
    getBrawlifyGameModes().catch(() => ({ list: [] })),
    getBrawlifyMaps().catch(() => ({ list: [] })),
  ]);
  const mode = modes.list.find((item) => String(item.id) === id);
  if (!mode) notFound();
  const displayName = translateModeName(mode.name, locale);
  const description = translateModeDescription(
    mode.name,
    mode.description ?? mode.shortDescription,
    locale,
  );

  const relatedMaps = selectIndexableMaps(maps.list)
    .filter((map) => map.gameMode?.name === mode.name)
    .slice(0, 24);

  return (
    <PortalLayout
      locale={locale}
      title={displayName}
      eyebrow={copy.detail.eyebrow}
      description={description || copy.detail.descriptionFallback}
      actions={<LinkButton href={localizedHref(locale, "/events")}>{copy.detail.action}</LinkButton>}
    >
      <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {mode.imageUrl ? (
          <BrawlImage
            src={mode.imageUrl}
            alt={displayName}
            width={280}
            height={280}
            className="h-64 w-full rounded-lg border border-white bg-white object-contain p-6 shadow-sm"
            fallbackText={displayName.slice(0, 1)}
          />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-white bg-white text-4xl font-black text-indigo-200 shadow-sm">
            {displayName.slice(0, 1)}
          </div>
        )}
        <div className="grid content-start gap-3 sm:grid-cols-3">
          <StatPill label={copy.detail.modeId} value={mode.id} />
          <StatPill label={copy.detail.status} value={mode.disabled ? copy.detail.inactive : copy.detail.active} />
          <StatPill label={copy.detail.relatedMaps} value={relatedMaps.length} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black text-indigo-950">{copy.detail.mapsInMode}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {relatedMaps.map((map) => (
            <Link
              key={map.id}
              href={localizedHref(locale, `/maps/${map.id}`)}
              className="rounded-lg border border-white bg-white p-4 font-black text-gray-800 shadow-sm transition-transform hover:-translate-y-0.5"
            >
              {translateMapName(map.name, locale)}
            </Link>
          ))}
        </div>
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
