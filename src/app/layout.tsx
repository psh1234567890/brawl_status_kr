import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const siteUrl = "https://www.brawl-o1.site";
const siteName = "브롤스타즈 전적 검색";
const siteDescription =
  "브롤스타즈 플레이어 전적 검색, 최근 전투 분석, 맵별 추천 브롤러, 스킨 카탈로그를 한국어로 확인하세요.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | Brawl Status KR`,
    template: `%s | Brawl Status KR`,
  },
  description: siteDescription,
  applicationName: "Brawl Status KR",
  authors: [{ name: "Brawl Status KR" }],
  creator: "Brawl Status KR",
  publisher: "Brawl Status KR",
  keywords: [
    "브롤스타즈 전적",
    "브롤스타즈 전적 검색",
    "브롤스타즈 프로필",
    "브롤스타즈 승률",
    "브롤스타즈 맵 추천",
    "브롤스타즈 추천 브롤러",
    "브롤스타즈 스킨",
    "브롤스타즈 통계",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${siteName} | Brawl Status KR`,
    description: siteDescription,
    url: siteUrl,
    siteName,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${siteName} | Brawl Status KR`,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteName,
    url: siteUrl,
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    inLanguage: "ko-KR",
    description: siteDescription,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
    },
    featureList: [
      "브롤스타즈 플레이어 전적 검색",
      "최근 전투 기록 분석",
      "맵별 추천 브롤러 통계",
      "브롤스타즈 스킨 카탈로그",
    ],
  };

  return (
    <html lang="ko">
      <body>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {adsenseClientId ? (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
