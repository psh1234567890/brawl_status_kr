import type { Metadata } from "next";
import Link from "next/link";
import BrawlImage from "../../components/BrawlImage";
import PortalLayout, { StatPill } from "../../components/PortalLayout";
import { brawlerDict } from "../../constants/brawl";
import { getBrawlifyBrawlers } from "../../server/brawlify";

export const metadata: Metadata = {
  title: "브롤러 도감",
  description: "Brawlify 브롤러 데이터를 기반으로 브롤러 등급, 클래스, 가젯, 스타파워 정보를 확인합니다.",
  alternates: { canonical: "/brawlers" },
};

export default async function BrawlersPage() {
  const brawlers = (await getBrawlifyBrawlers()).list;
  const released = brawlers.filter((brawler) => brawler.released !== false);
  const rarities = new Set(brawlers.map((brawler) => brawler.rarity?.name).filter(Boolean));

  return (
    <PortalLayout
      title="브롤러 도감"
      eyebrow="Brawler Roster"
      description="브롤러의 등급, 클래스, 설명, 가젯과 스타파워를 확인합니다. 플레이어 검색 화면에서는 실제 보유 상태와 승률도 함께 볼 수 있습니다."
      actions={<LinkButton href="/">내 브롤러 보기</LinkButton>}
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <StatPill label="전체 브롤러" value={brawlers.length} />
        <StatPill label="출시 브롤러" value={released.length} />
        <StatPill label="등급 수" value={rarities.size} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {released.map((brawler) => (
          <article key={brawler.id} className="rounded-lg border border-white bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <BrawlImage
                src={brawler.imageUrl2 ?? brawler.imageUrl ?? `https://cdn.brawlify.com/brawlers/borders/${brawler.id}.png`}
                alt={brawler.name}
                width={72}
                height={72}
                className="h-16 w-16 shrink-0 rounded-md bg-indigo-50 object-contain"
                fallbackText={brawler.name.slice(0, 1)}
              />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black text-gray-900">
                  {brawlerDict[brawler.name.toUpperCase()] ?? brawlerDict[brawler.name] ?? brawler.name}
                </h2>
                <p className="text-xs font-bold text-indigo-600">{brawler.rarity?.name ?? "Unknown"}</p>
                <p className="text-xs font-bold text-gray-400">{brawler.class?.name ?? "-"}</p>
              </div>
            </div>
            <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-gray-500">
              {brawler.description ?? "설명 데이터가 없습니다."}
            </p>
            <Link
              href={`/brawlers/${brawler.id}`}
              className="mt-4 inline-block rounded-full bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              상세 보기
            </Link>
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
