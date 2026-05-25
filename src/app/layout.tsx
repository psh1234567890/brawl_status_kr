import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import type { Metadata } from "next";

export const metadata: Metadata = 
{
    title: "브롤스타즈 전적 검색 - Analytics",
    description: "브롤스타즈 전적, 맵별 1티어 추천, 프로필 분석 및 자체 DB 누적 승률을 지금 바로 확인하세요!",
    keywords: ["브롤스타즈 전적", "브롤스타즈 프로필", "브롤 전적 검색", "브롤스타즈 맵 1티어", "브롤스타즈 통계"],
    openGraph: 
    {
        title: "브롤스타즈 전적 검색 - Analytics",
        description: "최근 25전 분석부터 빅데이터 누적 승률까지 완벽하게 분석해 드립니다.",
        url: "https://brawl-status-kr.vercel.app", // 기장님 Vercel 주소!
        siteName: "Brawl Analytics",
        locale: "ko_KR",
        type: "website"
    }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
