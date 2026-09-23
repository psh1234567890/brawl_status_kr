import type { Metadata } from "next";
import Link from "next/link";
import BrawlImage from "../../components/BrawlImage";
import PortalLayout, { StatPill } from "../../components/PortalLayout";
import { localeAlternates, numberLocales, localizedHref, type Locale } from "../../i18n/config";
import { getCatalogPageMessages } from "../../i18n/catalogPageMessages";
import { getBrawlifyMaps } from "../../server/brawlify";
import { translateMapName, translateModeName } from "../../utils/brawlTranslations";
import { selectIndexableMaps } from "../../utils/seoIndexing";

const koCopy = getCatalogPageMessages("ko").maps;

export const metadata: Metadata = {
  title: koCopy.metadata.title,
  description: koCopy.metadata.description,
  alternates: { canonical: "/maps", languages: localeAlternates("/maps") },
};

export default async function MapsPage() {
  return <MapsPageContent locale="ko" />;
}

export async function MapsPageContent({ locale }: { locale: Locale }) {
  const copy = getCatalogPageMessages(locale).maps;
  const maps = (await getBrawlifyMaps().catch(() => ({ list: [] }))).list;
  const activeMaps = maps.filter((map) => !map.disabled);
  const modes = new Set(maps.map((map) => map.gameMode?.name).filter(Boolean));
  const displayMaps = selectIndexableMaps(maps);

  return (
    <PortalLayout
      locale={locale}
      title={copy.list.title}
      eyebrow={copy.list.eyebrow}
      description={copy.list.description}
      actions={<LinkButton href={localizedHref(locale, "/events")}>{copy.list.action}</LinkButton>}
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <StatPill label={copy.list.totalMaps} value={maps.length.toLocaleString(numberLocales[locale])} />
        <StatPill label={copy.list.activeMaps} value={activeMaps.length.toLocaleString(numberLocales[locale])} />
        <StatPill label={copy.list.gameModes} value={modes.size.toLocaleString(numberLocales[locale])} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayMaps.map((map) => {
          const displayName = translateMapName(map.name, locale);
          const displayMode = translateModeName(map.gameMode?.name, locale) || copy.list.other;

          return (
          <article key={map.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {map.imageUrl ? (
              <BrawlImage
                src={map.imageUrl}
                alt={displayName}
                width={500}
                height={260}
                className="h-36 w-full object-cover"
                fallbackText={displayName.slice(0, 1)}
              />
            ) : (
              <div className="flex h-36 items-center justify-center bg-blue-50 text-3xl font-black text-blue-200">
                {displayName.slice(0, 1)}
              </div>
            )}
            <div className="p-4">
              <p className="text-xs font-black uppercase tracking-[0.06em] text-blue-600">
                {displayMode}
              </p>
              <h2 className="mt-1 truncate text-lg font-black text-slate-950" title={displayName}>
                {displayName}
              </h2>
              <p className="mt-2 text-xs font-bold text-slate-400">
                {copy.list.recentActive}: {formatUnixDate(map.lastActive, locale)}
              </p>
              <Link
                href={localizedHref(locale, `/maps/${map.id}`)}
                className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                {copy.list.detailView}
              </Link>
            </div>
          </article>
          );
        })}
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
