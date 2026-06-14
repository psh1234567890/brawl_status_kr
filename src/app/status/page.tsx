import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import PortalLayout, { StatPill } from "../../components/PortalLayout";
import { db } from "../../db";
import { translateBrawlerName, translateMapName } from "../../utils/brawlTranslations";

export const metadata: Metadata = {
  title: "데이터 수집 현황",
  description: "Brawl Status KR에 저장된 전투 기록 표본과 수집 현황을 확인합니다.",
  alternates: { canonical: "/status" },
};

type StatusRow = {
  totalBattles: number | string;
  players: number | string;
  maps: number | string;
  brawlers: number | string;
  latestBattle: string | null;
};

type PopularRow = {
  name: string;
  plays: number | string;
};

export default async function StatusPage() {
  const [summaryResult, popularMapsResult, popularBrawlersResult] = await Promise.all([
    db.execute<StatusRow>(sql`
      SELECT
        count(*) AS "totalBattles",
        count(DISTINCT player_tag) AS players,
        count(DISTINCT map) AS maps,
        count(DISTINCT brawler_name) AS brawlers,
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
    players: 0,
    maps: 0,
    brawlers: 0,
    latestBattle: null,
  };

  return (
    <PortalLayout
      title="데이터 수집 현황"
      eyebrow="데이터 현황"
      description="사이트 이용자가 플레이어 태그를 검색할 때 저장된 전투 표본 현황입니다. 맵 추천과 누적 승률은 이 데이터가 쌓일수록 더 정확해집니다."
    >
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatPill label="저장 전투" value={Number(summary.totalBattles).toLocaleString("ko-KR")} />
        <StatPill label="검색 플레이어" value={Number(summary.players).toLocaleString("ko-KR")} />
        <StatPill label="맵" value={Number(summary.maps).toLocaleString("ko-KR")} />
        <StatPill label="브롤러" value={Number(summary.brawlers).toLocaleString("ko-KR")} />
        <StatPill label="최근 수집" value={formatDate(summary.latestBattle)} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <RankingPanel title="많이 수집된 맵" rows={popularMapsResult.rows} translate={translateMapName} />
        <RankingPanel title="많이 수집된 브롤러" rows={popularBrawlersResult.rows} translate={translateBrawlerName} />
      </section>
    </PortalLayout>
  );
}

function RankingPanel({
  title,
  rows,
  translate,
}: {
  title: string;
  rows: PopularRow[];
  translate: (name: string) => string;
}) {
  return (
    <section className="rounded-lg border border-white bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-black text-indigo-950">{title}</h2>
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={row.name} className="flex items-center justify-between rounded-lg bg-indigo-50 p-3">
            <span className="font-black text-gray-800">#{index + 1} {translate(row.name)}</span>
            <span className="text-sm font-black text-indigo-700">
              {Number(row.plays).toLocaleString("ko-KR")}전
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
