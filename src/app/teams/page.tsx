import type { Metadata } from "next";
import PortalLayout from "../../components/PortalLayout";
import TeamMetaBrowser from "../../components/TeamMetaBrowser";

export const metadata: Metadata = {
  title: "팀 조합 추천",
  description: "저장된 팀전 표본 기반으로 맵별 브롤러 팀 조합 승률과 추천 점수를 확인합니다.",
  alternates: { canonical: "/teams" },
};

export default function TeamsPage() {
  return (
    <PortalLayout
      title="팀 조합 추천"
      eyebrow="Team Comps"
      description="우리 DB에 저장된 실제 팀전 표본을 기반으로 팀 조합의 승률과 추천 점수를 계산합니다. 친선전은 제외합니다."
    >
      <TeamMetaBrowser />
    </PortalLayout>
  );
}
