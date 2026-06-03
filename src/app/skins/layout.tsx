import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "브롤스타즈 스킨 카탈로그",
  description:
    "브롤스타즈 브롤러별 스킨, 희귀도, 가격 정보를 한국어 카탈로그로 검색하세요.",
  alternates: {
    canonical: "/skins",
  },
  openGraph: {
    title: "브롤스타즈 스킨 카탈로그 | Brawl Status KR",
    description:
      "브롤러별 스킨 목록과 희귀도, 가격 정보를 한곳에서 확인할 수 있습니다.",
    url: "/skins",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "브롤스타즈 스킨 카탈로그 | Brawl Status KR",
    description:
      "브롤러별 스킨 목록과 희귀도, 가격 정보를 한곳에서 확인할 수 있습니다.",
  },
};

export default function SkinsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
