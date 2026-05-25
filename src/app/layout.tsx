import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist(
{
    variable: "--font-geist-sans",
    subsets: ["latin"]
});

const geistMono = Geist_Mono(
{
    variable: "--font-geist-mono",
    subsets: ["latin"]
});

// ✨ 중복 없이 깔끔하게 하나만 배치된 메타데이터!
export const metadata: Metadata = 
{
    title: "브롤스타즈 전적 검색 - Analytics",
    description: "브롤스타즈 전적, 맵별 1티어 추천, 프로필 분석 및 자체 DB 누적 승률을 지금 바로 확인하세요!",
    keywords: ["브롤스타즈 전적", "브롤스타즈 프로필", "브롤 전적 검색", "브롤스타즈 맵 1티어", "브롤스타즈 통계"],
    openGraph: 
    {
        title: "브롤스타즈 전적 검색 - Analytics",
        description: "최근 25전 분석부터 빅데이터 누적 승률까지 완벽하게 분석해 드립니다.",
        url: "https://brawl-status-kr.vercel.app",
        siteName: "Brawl Analytics",
        locale: "ko_KR",
        type: "website"
    }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) 
{
    return (
        <html lang="ko">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                {children}
            </body>
        </html>
    );
}