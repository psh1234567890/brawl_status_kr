import type { Metadata } from "next";
import Link from "next/link";
import MapsBrowser from "../../components/MapsBrowser";
import PortalLayout, { StatPill } from "../../components/PortalLayout";
import { localeAlternates, numberLocales, localizedHref, type Locale } from "../../i18n/config";
import { getCatalogPageMessages } from "../../i18n/catalogPageMessages";
import { getBrawlifyMaps } from "../../server/brawlify";
import { selectBrowsableMaps } from "../../utils/seoIndexing";

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
  const displayMaps = selectBrowsableMaps(maps);
  const modes = new Set(displayMaps.map((map) => map.gameMode?.name).filter(Boolean));

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
        <StatPill label={copy.list.activeMaps} value={displayMaps.length.toLocaleString(numberLocales[locale])} />
        <StatPill label={copy.list.gameModes} value={modes.size.toLocaleString(numberLocales[locale])} />
      </section>

      <MapsBrowser
        locale={locale}
        maps={displayMaps.map((map) => ({
          id: map.id,
          name: map.name,
          imageUrl: map.imageUrl,
          lastActive: map.lastActive,
          gameModeName: map.gameMode?.name,
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
