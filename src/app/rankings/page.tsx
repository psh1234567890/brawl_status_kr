import type { Metadata } from "next";
import PortalLayout from "../../components/PortalLayout";
import RankingsBrowser from "../../components/RankingsBrowser";
import { getBrawlifyBrawlers } from "../../server/brawlify";

export const metadata: Metadata = {
  title: "브롤스타즈 랭킹",
  description: "공식 Brawl Stars API 기반 글로벌/국가별 플레이어, 클럽, 브롤러 랭킹을 확인합니다.",
  alternates: { canonical: "/rankings" },
};

export default async function RankingsPage() {
  const brawlers = (await getBrawlifyBrawlers()).list;

  return (
    <PortalLayout
      title="랭킹"
      eyebrow="랭킹"
      description="플레이어, 클럽, 브롤러별 글로벌/국가별 랭킹을 확인합니다. 브롤러 랭킹은 원하는 브롤러를 선택해 볼 수 있습니다."
    >
      <RankingsBrowser brawlers={brawlers} />
    </PortalLayout>
  );
}
