import type { Metadata } from "next";
import DraftRecommendation from "../../../components/DraftRecommendation";

export const metadata: Metadata = {
  title: "팀 조합 추천 | Brawloop",
  description: "맵과 양 팀의 브롤러를 입력하고 시즌 55 모델의 추천을 비교하세요.",
  robots: { index: false, follow: true },
};

export default function DraftPage() {
  return <DraftRecommendation />;
}
