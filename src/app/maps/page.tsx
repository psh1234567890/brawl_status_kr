import type { Metadata } from "next";
import Link from "next/link";
import BrawlImage from "../../components/BrawlImage";
import PortalLayout, { StatPill } from "../../components/PortalLayout";
import { getBrawlifyMaps } from "../../server/brawlify";
import { translateMapName, translateModeName } from "../../utils/brawlTranslations";

export const metadata: Metadata = {
  title: "브롤스타즈 맵 도감",
  description: "Brawlify 맵 데이터를 기반으로 브롤스타즈 맵, 게임모드, 최근 활성 정보를 확인합니다.",
  alternates: { canonical: "/maps" },
};

export default async function MapsPage() {
  const maps = (await getBrawlifyMaps()).list;
  const activeMaps = maps.filter((map) => !map.disabled);
  const modes = new Set(maps.map((map) => map.gameMode?.name).filter(Boolean));
  const recentMaps = [...maps]
    .filter((map) => map.lastActive)
    .sort((left, right) => (right.lastActive ?? 0) - (left.lastActive ?? 0))
    .slice(0, 80);
  const displayMaps = recentMaps.length ? recentMaps : activeMaps.slice(0, 80);

  return (
    <PortalLayout
      title="맵 도감"
      eyebrow="맵 도감"
      description="맵 이미지, 게임모드, 최근 활성 여부를 한곳에서 확인합니다. 각 맵 상세에서 같은 모드의 다른 맵과 DB 추천으로 이어갈 수 있습니다."
      actions={<LinkButton href="/events">현재 로테이션</LinkButton>}
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <StatPill label="전체 맵" value={maps.length.toLocaleString("ko-KR")} />
        <StatPill label="활성 맵" value={activeMaps.length.toLocaleString("ko-KR")} />
        <StatPill label="게임모드" value={modes.size.toLocaleString("ko-KR")} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayMaps.map((map) => {
          const displayName = translateMapName(map.name);
          const displayMode = translateModeName(map.gameMode?.name) || "기타";

          return (
          <article key={map.id} className="overflow-hidden rounded-lg border border-white bg-white shadow-sm">
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
              <div className="flex h-36 items-center justify-center bg-indigo-50 text-3xl font-black text-indigo-200">
                {displayName.slice(0, 1)}
              </div>
            )}
            <div className="p-4">
              <p className="text-xs font-black text-indigo-500">
                {displayMode}
              </p>
              <h2 className="mt-1 truncate text-lg font-black text-gray-900" title={displayName}>
                {displayName}
              </h2>
              <p className="mt-2 text-xs font-bold text-gray-400">
                최근 활성: {formatUnixDate(map.lastActive)}
              </p>
              <Link
                href={`/maps/${map.id}`}
                className="mt-4 inline-block rounded-full bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                상세 보기
              </Link>
            </div>
          </article>
          );
        })}
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
