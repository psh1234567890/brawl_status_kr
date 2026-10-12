import type { Metadata } from "next";
import Script from "next/script";
import UsageSessionTracker from "../components/UsageSessionTracker";
import {
  localeAlternates,
  localizedLocales,
  numberLocales,
} from "../i18n/config";
import "./globals.css";

const siteUrl = "https://www.brawl-o1.site";
const siteName = "브롤스타즈 전적 검색";
const siteDescription =
  "브롤스타즈 플레이어 전적 검색, 최근 전투 분석, 맵별 추천 브롤러, 스킨 카탈로그를 한국어로 확인하세요.";
const documentLangByPathSegment = Object.fromEntries(
  localizedLocales.map((locale) => [locale, numberLocales[locale]]),
);
const documentLangScript =
  "(()=>{const m=" +
  JSON.stringify(documentLangByPathSegment) +
  ";const s=location.pathname.split('/')[1]?.toLowerCase();document.documentElement.lang=m[s]??" +
  JSON.stringify(numberLocales.ko) +
  ";})();";

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
  alternates: {
    canonical: "/",
    languages: localeAlternates("/"),
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
    "@id": siteUrl + "/#webapp",
    name: "Brawl Status KR",
    url: siteUrl,
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    // Global product information is language-neutral; the [lang] layout
    // adds locale-specific WebSite structured data for translated routes.
    inLanguage: Object.values(numberLocales),
    description: "Brawl Stars player statistics, recent battles, map meta and Brawler comparisons in multiple languages.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
    },
    featureList: [
      "Brawl Stars player search",
      "Recent battle analysis",
      "Map-based Brawler recommendations",
      "Skin catalog and player comparison",
    ],
  };

  return (
    <html lang="und" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: documentLangScript }} />
      </head>
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
            strategy="beforeInteractive"
          />
        ) : null}
        <UsageSessionTracker />
        {children}
      </body>
    </html>
  );
}
