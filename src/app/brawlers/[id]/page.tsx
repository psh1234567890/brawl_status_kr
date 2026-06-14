import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrawlImage from "../../../components/BrawlImage";
import PortalLayout, { StatPill } from "../../../components/PortalLayout";
import { getBrawlifyBrawlers } from "../../../server/brawlify";
import {
  translateAbilityName,
  translateBrawlerClassName,
  translateBrawlerDescription,
  translateBrawlerName,
  translateRarityName,
} from "../../../utils/brawlTranslations";

interface BrawlerDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BrawlerDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const brawler = (await getBrawlifyBrawlers()).list.find((item) => String(item.id) === id);
  const name = brawler ? translateBrawlerName(brawler.name) : "브롤러";
  return {
    title: `${name} 브롤러 상세`,
    alternates: { canonical: `/brawlers/${id}` },
  };
}

export default async function BrawlerDetailPage({ params }: BrawlerDetailPageProps) {
  const { id } = await params;
  const brawler = (await getBrawlifyBrawlers()).list.find((item) => String(item.id) === id);
  if (!brawler) notFound();

  const displayName = translateBrawlerName(brawler.name);
  const description = translateBrawlerDescription(brawler.name, brawler.description);

  return (
    <PortalLayout
      title={displayName}
      eyebrow={`${translateRarityName(brawler.rarity?.name) || "알 수 없음"} · ${translateBrawlerClassName(brawler.class?.name) || "역할"}`}
      description={description || "Brawlify 브롤러 데이터 기반 상세 화면입니다."}
      actions={<LinkButton href="/">내 전적에서 보기</LinkButton>}
    >
      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <BrawlImage
          src={brawler.imageUrl2 ?? brawler.imageUrl ?? `https://cdn.brawlify.com/brawlers/borders/${brawler.id}.png`}
          alt={displayName}
          width={320}
          height={320}
          className="h-80 w-full rounded-lg border border-white bg-white object-contain p-6 shadow-sm"
          fallbackText={displayName.slice(0, 1)}
        />
        <div className="grid content-start gap-3 sm:grid-cols-2">
          <StatPill label="브롤러 ID" value={brawler.id} />
          <StatPill label="등급" value={translateRarityName(brawler.rarity?.name) || "-"} />
          <StatPill label="클래스" value={translateBrawlerClassName(brawler.class?.name) || "-"} />
          <StatPill label="출시 여부" value={brawler.released === false ? "미출시" : "출시"} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AbilityPanel title="가젯" items={brawler.gadgets ?? []} imageType="gadgets" />
        <AbilityPanel title="스타파워" items={brawler.starPowers ?? []} imageType="star-powers" />
      </section>
    </PortalLayout>
  );
}

function AbilityPanel({
  title,
  items,
  imageType,
}: {
  title: string;
  items: { id: number; name: string }[];
  imageType: string;
}) {
  return (
    <section className="rounded-lg border border-white bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-black text-indigo-950">{title}</h2>
      {items.length ? (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const displayName = translateAbilityName(item.id, item.name);

            return (
            <div key={item.id} className="flex items-center gap-3 rounded-lg bg-indigo-50 p-3">
              <BrawlImage
                src={`https://cdn.brawlify.com/${imageType}/regular/${item.id}.png`}
                alt={displayName}
                width={40}
                height={40}
                className="h-10 w-10 rounded-md"
                fallbackText={title.slice(0, 1)}
              />
              <span className="font-black text-gray-800">{displayName}</span>
            </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm font-bold text-gray-400">데이터가 없습니다.</p>
      )}
    </section>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-black text-white shadow-sm transition-colors hover:bg-indigo-700">
      {children}
    </Link>
  );
}
