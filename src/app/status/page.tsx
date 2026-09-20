import type { Metadata } from "next";
import { connection } from "next/server";
import { sql } from "drizzle-orm";
import PortalLayout, { StatPill } from "../../components/PortalLayout";
import { db } from "../../db";
import { numberLocales, type Locale } from "../../i18n/config";
import { getMessages } from "../../i18n/messages";
import { translateBrawlerName, translateMapName } from "../../utils/brawlTranslations";

export const metadata: Metadata = {
  title: "데이터 수집 현황",
  description: "Brawl Status KR에 저장된 전투 기록 표본과 수집 현황을 확인합니다.",
  alternates: { canonical: "/status" },
};

type StatusRow = {
  totalBattles: number | string;
  uniqueBattles: number | string;
  players: number | string;
  maps: number | string;
  brawlers: number | string;
  latestBattle: string | null;
};

type PopularRow = {
  name: string;
  plays: number | string;
};

export default function StatusPage() {
  return <StatusPageContent locale="ko" />;
}

export async function StatusPageContent({ locale }: { locale: Locale }) {
  await connection();
  const copy = getMessages(locale).status;

  const [summaryResult, popularMapsResult, popularBrawlersResult] = await Promise.all([
    db.execute<StatusRow>(sql`
      SELECT
        count(*) AS "totalBattles",
        count(DISTINCT battle_fingerprint) AS "uniqueBattles",
        count(DISTINCT player_tag) AS players,
        count(DISTINCT map) AS maps,
        count(DISTINCT brawler_name) FILTER (WHERE brawler_name <> 'Unknown') AS brawlers,
        max(battle_timestamp)::text AS "latestBattle"
      FROM battle_logs
    `),
    db.execute<PopularRow>(sql`
      SELECT map AS name, count(*) AS plays
      FROM battle_logs
      GROUP BY map
      ORDER BY count(*) DESC
      LIMIT 10
    `),
    db.execute<PopularRow>(sql`
      SELECT brawler_name AS name, count(*) AS plays
      FROM battle_logs
      WHERE brawler_name <> 'Unknown'
      GROUP BY brawler_name
      ORDER BY count(*) DESC
      LIMIT 10
    `),
  ]);

  const summary = summaryResult.rows[0] ?? {
    totalBattles: 0,
    uniqueBattles: 0,
    players: 0,
    maps: 0,
    brawlers: 0,
    latestBattle: null,
  };

  return (
    <PortalLayout
      locale={locale}
      title={copy.title}
      eyebrow={copy.eyebrow}
      description={copy.description}
    >
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatPill label={copy.totalRows} value={Number(summary.totalBattles).toLocaleString(numberLocales[locale])} />
        <StatPill label={copy.uniqueBattles} value={Number(summary.uniqueBattles).toLocaleString(numberLocales[locale])} />
        <StatPill label={copy.uniqueTags} value={Number(summary.players).toLocaleString(numberLocales[locale])} />
        <StatPill label={copy.maps} value={Number(summary.maps).toLocaleString(numberLocales[locale])} />
        <StatPill label={copy.brawlers} value={Number(summary.brawlers).toLocaleString(numberLocales[locale])} />
        <StatPill label={copy.latest} value={formatDate(summary.latestBattle, locale)} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <RankingPanel title={copy.popularMaps} rows={popularMapsResult.rows} translate={(name) => translateMapName(name, locale)} locale={locale} battlesLabel={copy.battles} />
        <RankingPanel title={copy.popularBrawlers} rows={popularBrawlersResult.rows} translate={(name) => translateBrawlerName(name, locale)} locale={locale} battlesLabel={copy.battles} />
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
    <section className="rounded-lg border border-white bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-black text-indigo-950">{title}</h2>
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={row.name} className="flex items-center justify-between rounded-lg bg-indigo-50 p-3">
            <span className="font-black text-gray-800">#{index + 1} {translate(row.name)}</span>
            <span className="text-sm font-black text-indigo-700">
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
