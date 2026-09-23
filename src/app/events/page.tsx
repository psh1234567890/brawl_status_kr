import type { Metadata } from "next";
import Link from "next/link";
import BrawlImage from "../../components/BrawlImage";
import PortalLayout, { EmptyState, StatPill } from "../../components/PortalLayout";
import { localeAlternates, localizedHref, numberLocales, type Locale } from "../../i18n/config";
import { getCatalogPageMessages } from "../../i18n/catalogPageMessages";
import { getBrawlifyEvents } from "../../server/brawlify";
import type { BrawlifyEvent } from "../../types/brawlify";
import { translateMapName, translateModeName } from "../../utils/brawlTranslations";

const koCopy = getCatalogPageMessages("ko").events;

export const metadata: Metadata = {
  title: koCopy.metadata.title,
  description: koCopy.metadata.description,
  alternates: { canonical: "/events", languages: localeAlternates("/events") },
};

export default async function EventsPage() {
  return <EventsPageContent locale="ko" />;
}

export async function EventsPageContent({ locale }: { locale: Locale }) {
  const copy = getCatalogPageMessages(locale).events;
  const events = await getBrawlifyEvents().catch(() => ({ active: [], upcoming: [] }));
  const total = events.active.length + events.upcoming.length;

  return (
    <PortalLayout
      locale={locale}
      title={copy.title}
      eyebrow={copy.eyebrow}
      description={copy.description}
      actions={<LinkButton href={localizedHref(locale, "/meta")}>{copy.action}</LinkButton>}
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <StatPill label={copy.currentEvents} value={events.active.length} />
        <StatPill label={copy.upcomingEvents} value={events.upcoming.length} />
        <StatPill label={copy.totalSlots} value={total} />
      </section>

      <EventSection title={copy.activeSection} events={events.active} locale={locale} />
      <EventSection title={copy.upcomingSection} events={events.upcoming} locale={locale} />
    </PortalLayout>
  );
}

function EventSection({ title, events, locale }: { title: string; events: BrawlifyEvent[]; locale: Locale }) {
  const copy = getCatalogPageMessages(locale).events;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-black text-blue-950">{title}</h2>
      {events.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event, index) => {
            const map = event.map;
            const modeName = map?.gameMode?.name ?? event.slot?.name;
            const mapName = map?.name;
            const displayMode = translateModeName(modeName, locale) || copy.unknown;
            const displayMap = translateMapName(mapName, locale) || copy.unknownMap;
            return (
              <article key={`${title}-${map?.id ?? index}-${event.startTime ?? ""}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                {map?.imageUrl ? (
                  <BrawlImage
                    src={map.imageUrl}
                    alt={displayMap}
                    width={640}
                    height={320}
                    className="h-40 w-full object-cover"
                    fallbackText={displayMap.slice(0, 1)}
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-blue-50 text-3xl font-black text-blue-200">
                    {displayMap.slice(0, 1)}
                  </div>
                )}
                <div className="flex flex-col gap-3 p-4">
                  <div>
                    <p className="text-xs font-black text-blue-500">{displayMode}</p>
                    <h3 className="mt-1 text-xl font-black text-slate-900">{displayMap}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
                    <span>{copy.start}: {formatDate(event.startTime, locale)}</span>
                    <span>{copy.end}: {formatDate(event.endTime, locale)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {map?.id ? <LinkButton href={localizedHref(locale, `/maps/${map.id}`)}>{copy.mapDetail}</LinkButton> : null}
                    <LinkButton href={localizedHref(locale, "/meta")}>{copy.recommendation}</LinkButton>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState text={copy.empty} />
      )}
    </section>
  );
}

function formatDate(value: string | undefined, locale: Locale) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(numberLocales[locale], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-blue-700">
      {children}
    </Link>
  );
}
