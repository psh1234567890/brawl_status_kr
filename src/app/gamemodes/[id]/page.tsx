import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrawlImage from "../../../components/BrawlImage";
import PortalLayout, { StatPill } from "../../../components/PortalLayout";
import { mapDict, modeDict } from "../../../constants/brawl";
import { getBrawlifyGameModes, getBrawlifyMaps } from "../../../server/brawlify";

interface GameModeDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: GameModeDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const mode = (await getBrawlifyGameModes()).list.find((item) => String(item.id) === id);
  return {
    title: mode ? `${modeDict[mode.name] ?? mode.name} 모드 상세` : "게임모드 상세",
    alternates: { canonical: `/gamemodes/${id}` },
  };
}

export default async function GameModeDetailPage({ params }: GameModeDetailPageProps) {
  const { id } = await params;
  const [modes, maps] = await Promise.all([getBrawlifyGameModes(), getBrawlifyMaps()]);
  const mode = modes.list.find((item) => String(item.id) === id);
  if (!mode) notFound();

  const relatedMaps = maps.list
    .filter((map) => map.gameMode?.name === mode.name)
    .sort((left, right) => (right.lastActive ?? 0) - (left.lastActive ?? 0))
    .slice(0, 24);

  return (
    <PortalLayout
      title={modeDict[mode.name] ?? mode.name}
      eyebrow="Game Mode"
      description={mode.description ?? mode.shortDescription ?? "Brawlify 게임모드 데이터 기반 상세 화면입니다."}
      actions={<LinkButton href="/events">로테이션 보기</LinkButton>}
    >
      <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {mode.imageUrl ? (
          <BrawlImage
            src={mode.imageUrl}
            alt={mode.name}
            width={280}
            height={280}
            className="h-64 w-full rounded-lg border border-white bg-white object-contain p-6 shadow-sm"
            fallbackText={mode.name.slice(0, 1)}
          />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-white bg-white text-4xl font-black text-indigo-200 shadow-sm">
            {mode.name.slice(0, 1)}
          </div>
        )}
        <div className="grid content-start gap-3 sm:grid-cols-3">
          <StatPill label="모드 ID" value={mode.id} />
          <StatPill label="상태" value={mode.disabled ? "비활성" : "활성"} />
          <StatPill label="연결 맵" value={relatedMaps.length} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-black text-indigo-950">이 모드의 맵</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {relatedMaps.map((map) => (
            <Link
              key={map.id}
              href={`/maps/${map.id}`}
              className="rounded-lg border border-white bg-white p-4 font-black text-gray-800 shadow-sm transition-transform hover:-translate-y-0.5"
            >
              {mapDict[map.name] ?? map.name}
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
