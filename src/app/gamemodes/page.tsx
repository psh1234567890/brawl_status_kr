import type { Metadata } from "next";
import Link from "next/link";
import BrawlImage from "../../components/BrawlImage";
import PortalLayout, { StatPill } from "../../components/PortalLayout";
import { localeAlternates, localizedHref, type Locale } from "../../i18n/config";
import { getCatalogPageMessages } from "../../i18n/catalogPageMessages";
import { getBrawlifyGameModes } from "../../server/brawlify";
import { translateModeDescription, translateModeName } from "../../utils/brawlTranslations";
import { selectIndexableGameModes } from "../../utils/seoIndexing";

const koCopy = getCatalogPageMessages("ko").gamemodes;

export const metadata: Metadata = {
  title: koCopy.metadata.title,
  description: koCopy.metadata.description,
  alternates: { canonical: "/gamemodes", languages: localeAlternates("/gamemodes") },
};

export default async function GameModesPage() {
  return <GameModesPageContent locale="ko" />;
}

export async function GameModesPageContent({ locale }: { locale: Locale }) {
  const copy = getCatalogPageMessages(locale).gamemodes;
  const modes = (await getBrawlifyGameModes().catch(() => ({ list: [] }))).list;
  const enabled = selectIndexableGameModes(modes);

  return (
    <PortalLayout
      locale={locale}
      title={copy.list.title}
      eyebrow={copy.list.eyebrow}
      description={copy.list.description}
      actions={<LinkButton href={localizedHref(locale, "/maps")}>{copy.list.action}</LinkButton>}
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <StatPill label={copy.list.totalModes} value={modes.length} />
        <StatPill label={copy.list.activeModes} value={enabled.length} />
        <StatPill label={copy.list.inactiveIncluded} value={modes.length - enabled.length} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {enabled.map((mode) => {
          const displayName = translateModeName(mode.name, locale);
          const description = translateModeDescription(
            mode.name,
            mode.shortDescription ?? mode.description,
            locale,
          );

          return (
          <article key={mode.id} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            {mode.imageUrl ? (
              <BrawlImage
                src={mode.imageUrl}
                alt={displayName}
                width={72}
                height={72}
                className="h-16 w-16 shrink-0 rounded-md bg-blue-50 object-cover"
                fallbackText={displayName.slice(0, 1)}
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-blue-50 font-black text-blue-300">
                {displayName.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-900">{displayName}</h2>
              <p className="mt-1 line-clamp-3 text-sm font-medium leading-6 text-slate-500">
                {description || copy.list.noDescription}
              </p>
              <Link
                href={localizedHref(locale, `/gamemodes/${mode.id}`)}
                className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-blue-700"
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

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700">
      {children}
    </Link>
  );
}
