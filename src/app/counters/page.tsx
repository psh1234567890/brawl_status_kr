import type { Metadata } from "next";
import CounterBrowser from "../../components/CounterBrowser";
import PortalLayout from "../../components/PortalLayout";
import { getBrawlifyBrawlers } from "../../server/brawlify";

export const metadata: Metadata = {
  title: "브롤러 카운터 추천",
  description: "저장된 팀전 표본 기반으로 특정 브롤러를 상대로 강했던 카운터 브롤러를 확인합니다.",
  alternates: { canonical: "/counters" },
};

export default async function CountersPage() {
  const brawlers = (await getBrawlifyBrawlers()).list;

  return (
    <PortalLayout
      title="브롤러 카운터"
      eyebrow="Counters"
      description="우리 DB에 저장된 실제 팀전 표본에서 선택한 브롤러를 상대로 승률이 높았던 상대 브롤러를 계산합니다. 표본이 적으면 결과가 비어 있을 수 있습니다."
    >
      <CounterBrowser brawlers={brawlers} />
    </PortalLayout>
  );
}
