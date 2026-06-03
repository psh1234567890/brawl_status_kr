import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "브롤스타즈 맵별 추천 브롤러",
  description:
    "검색 표본 기반으로 브롤스타즈 맵별 브롤러 승률과 추천 점수를 확인하세요.",
  alternates: {
    canonical: "/meta",
  },
  openGraph: {
    title: "브롤스타즈 맵별 추천 브롤러 | Brawl Status KR",
    description:
      "맵별 전투 기록을 기반으로 추천 브롤러와 승률 통계를 한국어로 보여줍니다.",
    url: "/meta",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "브롤스타즈 맵별 추천 브롤러 | Brawl Status KR",
    description:
      "맵별 전투 기록을 기반으로 추천 브롤러와 승률 통계를 한국어로 보여줍니다.",
  },
};

export default function MetaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
