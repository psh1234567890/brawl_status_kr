import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "브롤스타즈 전적 검색 - Analytics",
  description:
    "브롤스타즈 전적, 맵별 1티어 추천, 프로필 분석 및 자체 DB 전적 승률을 확인하세요.",
  keywords: [
    "브롤스타즈 전적",
    "브롤스타즈 프로필",
    "브롤스타즈 전적 검색",
    "브롤스타즈 맵 1티어",
    "브롤스타즈 통계",
  ],
  openGraph: {
    title: "브롤스타즈 전적 검색 - Analytics",
    description:
      "최근 전투 기록과 DB 기반 맵별 추천 브롤러를 분석합니다.",
    url: "https://brawl-status-kr.vercel.app",
    siteName: "Brawl Analytics",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
