import type { Metadata } from "next";
import Link from "next/link";
import BrawlImage from "../../components/BrawlImage";
import PortalLayout, { StatPill } from "../../components/PortalLayout";
import { modeDict } from "../../constants/brawl";
import { getBrawlifyGameModes } from "../../server/brawlify";

export const metadata: Metadata = {
  title: "브롤스타즈 게임모드 도감",
  description: "Brawlify 게임모드 데이터를 기반으로 브롤스타즈 모드 설명과 이미지를 확인합니다.",
  alternates: { canonical: "/gamemodes" },
};

export default async function GameModesPage() {
  const modes = (await getBrawlifyGameModes()).list;
  const enabled = modes.filter((mode) => !mode.disabled);

  return (
    <PortalLayout
      title="게임모드 도감"
      eyebrow="Mode Atlas"
      description="모드별 목표와 설명을 빠르게 확인할 수 있는 도감입니다. 맵 도감과 로테이션 페이지로 이어서 현재 플레이할 맵까지 확인할 수 있습니다."
      actions={<LinkButton href="/maps">맵 도감</LinkButton>}
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <StatPill label="전체 모드" value={modes.length} />
        <StatPill label="활성 모드" value={enabled.length} />
        <StatPill label="비활성/이벤트 포함" value={modes.length - enabled.length} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modes.map((mode) => (
          <article key={mode.id} className="flex gap-4 rounded-lg border border-white bg-white p-4 shadow-sm">
            {mode.imageUrl ? (
              <BrawlImage
                src={mode.imageUrl}
                alt={mode.name}
                width={72}
                height={72}
                className="h-16 w-16 shrink-0 rounded-md bg-indigo-50 object-cover"
                fallbackText={mode.name.slice(0, 1)}
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-indigo-50 font-black text-indigo-300">
                {mode.name.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-black text-gray-900">{modeDict[mode.name] ?? mode.name}</h2>
              <p className="mt-1 line-clamp-3 text-sm font-medium leading-6 text-gray-500">
                {mode.shortDescription ?? mode.description ?? "설명 데이터가 없습니다."}
              </p>
              <Link
                href={`/gamemodes/${mode.id}`}
                className="mt-3 inline-block rounded-full bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                상세 보기
              </Link>
            </div>
          </article>
        ))}
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
