import type { Metadata } from "next";
import { connection } from "next/server";
import PortalLayout, { StatPill } from "../../components/PortalLayout";
import { numberLocales, type Locale } from "../../i18n/config";
import { getMessages } from "../../i18n/messages";
import { getDataStatus, type PopularRow } from "../../server/dataStatus";
import { translateBrawlerName, translateMapName } from "../../utils/brawlTranslations";

export const metadata: Metadata = {
  title: "데이터 수집 현황",
  description: "Brawl Status KR에 저장된 전투 기록 표본과 수집 현황을 확인합니다.",
  alternates: { canonical: "/status" },
};

export default function StatusPage() {
  return <StatusPageContent locale="ko" />;
}

export async function StatusPageContent({ locale }: { locale: Locale }) {
  await connection();
  const copy = getMessages(locale).status;

  const data = await getDataStatus();
  if (!data) {
    return (
      <PortalLayout locale={locale} title={copy.title} eyebrow={copy.eyebrow} description={copy.description}>
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          {copy.unavailable}
        </p>
      </PortalLayout>
    );
  }
  const { summary } = data;

  return (
    <PortalLayout
      locale={locale}
      title={copy.title}
      eyebrow={copy.eyebrow}
      description={copy.description}
    >
      <p className="text-sm text-slate-600">{copy.cacheNotice} {copy.snapshotAt}: {formatDate(data.sampledAt, locale)}</p>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatPill label={copy.totalRows} value={Number(summary.totalBattles).toLocaleString(numberLocales[locale])} />
        <StatPill label={copy.uniqueBattles} value={Number(summary.uniqueBattles).toLocaleString(numberLocales[locale])} />
        <StatPill label={copy.uniqueTags} value={Number(summary.players).toLocaleString(numberLocales[locale])} />
        <StatPill label={copy.maps} value={Number(summary.maps).toLocaleString(numberLocales[locale])} />
        <StatPill label={copy.brawlers} value={Number(summary.brawlers).toLocaleString(numberLocales[locale])} />
        <StatPill label={copy.latest} value={formatDate(summary.latestBattle, locale)} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <RankingPanel title={copy.popularMaps} rows={summary.popularMaps} translate={(name) => translateMapName(name, locale)} locale={locale} battlesLabel={copy.battles} />
        <RankingPanel title={copy.popularBrawlers} rows={summary.popularBrawlers} translate={(name) => translateBrawlerName(name, locale)} locale={locale} battlesLabel={copy.battles} />
      </section>
    </PortalLayout>
  );
}

function RankingPanel({
  title,
  rows,
  translate,
  locale,
  battlesLabel,
}: {
  title: string;
  rows: PopularRow[];
  translate: (name: string) => string;
  locale: Locale;
  battlesLabel: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-black text-blue-950">{title}</h2>
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={row.name} className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
            <span className="font-black text-slate-800">#{index + 1} {translate(row.name)}</span>
            <span className="text-sm font-black text-blue-700">
              {Number(row.plays).toLocaleString(numberLocales[locale])} {battlesLabel}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(numberLocales[locale], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(date);
}
