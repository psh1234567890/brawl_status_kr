import type { Metadata } from "next";
import { localeAlternates } from "../../i18n/config";

export const metadata: Metadata = {
  title: "브롤스타즈 맵별 추천 브롤러 | 승률·메타",
  description:
    "브롤스타즈 맵별 브롤러 추천을 저장된 전투 표본으로 비교하세요. 맵별 승률, 표본 수, 추천 점수와 신뢰도를 함께 확인할 수 있습니다.",
  alternates: {
    canonical: "/meta",
    languages: localeAlternates("/meta"),
  },
  openGraph: {
    title: "브롤스타즈 맵별 추천 브롤러 | 승률·메타 | Brawl Status KR",
    description:
      "저장된 전투 기록으로 맵별 브롤러 승률, 표본 수, 추천 점수와 신뢰도를 비교합니다.",
    url: "/meta",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "브롤스타즈 맵별 추천 브롤러 | 승률·메타 | Brawl Status KR",
    description:
      "저장된 전투 기록으로 맵별 브롤러 승률, 표본 수, 추천 점수와 신뢰도를 비교합니다.",
  },
};

export default function MetaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
