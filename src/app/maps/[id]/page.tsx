import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrawlImage from "../../../components/BrawlImage";
import PortalLayout, { StatPill } from "../../../components/PortalLayout";
import { mapDict, modeDict } from "../../../constants/brawl";
import { getBrawlifyMaps } from "../../../server/brawlify";

interface MapDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: MapDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const map = (await getBrawlifyMaps()).list.find((item) => String(item.id) === id);
  return {
    title: map ? `${mapDict[map.name] ?? map.name} 맵 상세` : "맵 상세",
    alternates: { canonical: `/maps/${id}` },
  };
}

export default async function MapDetailPage({ params }: MapDetailPageProps) {
  const { id } = await params;
  const maps = (await getBrawlifyMaps()).list;
  const map = maps.find((item) => String(item.id) === id);
  if (!map) notFound();

  const sameModeMaps = maps
    .filter((item) => item.id !== map.id && item.gameMode?.name === map.gameMode?.name)
    .slice(0, 12);

  return (
    <PortalLayout
      title={mapDict[map.name] ?? map.name}
      eyebrow={modeDict[map.gameMode?.name ?? ""] ?? map.gameMode?.name ?? "Map"}
      description="Brawlify 맵 데이터를 기반으로 표시하는 맵 상세 정보입니다. 저장된 전투 표본이 쌓이면 맵 추천 페이지에서 우리 DB 기반 추천 브롤러를 함께 확인할 수 있습니다."
      actions={<LinkButton href="/meta">DB 추천 보기</LinkButton>}
    >
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-lg border border-white bg-white shadow-sm">
          {map.imageUrl ? (
            <BrawlImage
              src={map.imageUrl}
              alt={map.name}
              width={900}
              height={500}
              className="h-auto w-full object-cover"
              fallbackText={map.name.slice(0, 1)}
            />
          ) : (
            <div className="flex h-72 items-center justify-center bg-indigo-50 text-5xl font-black text-indigo-200">
              {map.name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <StatPill label="맵 ID" value={map.id} />
          <StatPill label="게임모드" value={modeDict[map.gameMode?.name ?? ""] ?? map.gameMode?.name ?? "-"} />
          <StatPill label="환경" value={map.environment?.name ?? "-"} />
          <StatPill label="최근 활성" value={formatUnixDate(map.lastActive)} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black text-indigo-950">같은 모드의 다른 맵</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sameModeMaps.map((item) => (
            <Link
              key={item.id}
              href={`/maps/${item.id}`}
              className="rounded-lg border border-white bg-white p-4 font-black text-gray-800 shadow-sm transition-transform hover:-translate-y-0.5"
            >
              {mapDict[item.name] ?? item.name}
            </Link>
          ))}
        </div>
      </section>
    </PortalLayout>
  );
}

function formatUnixDate(value?: number) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value * 1000));
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-black text-white shadow-sm transition-colors hover:bg-indigo-700">
      {children}
    </Link>
  );
}
