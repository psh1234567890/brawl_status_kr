import type { Metadata } from "next";
import ClubSearch from "../../components/ClubSearch";
import PortalLayout from "../../components/PortalLayout";

export const metadata: Metadata = {
  title: "클럽 검색",
  description: "브롤스타즈 클럽 태그로 클럽 정보와 멤버 목록을 검색합니다.",
  alternates: { canonical: "/clubs" },
};

export default function ClubsPage() {
  return (
    <PortalLayout
      title="클럽 검색"
      eyebrow="클럽 추적"
      description="공식 Brawl Stars API로 클럽 정보와 멤버 목록을 조회합니다. 클럽원 활동량 비교는 검색 기록이 더 쌓이면 확장할 수 있습니다."
    >
      <ClubSearch />
    </PortalLayout>
  );
}
