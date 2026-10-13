import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
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
  "브롤스타즈 전적 검색부터 브롤러 퀴즈까지. Brawloop에서 최근 전투와 성장 기록을 확인하고 친구와 비교해 보세요.";
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
    default: `${siteName} | Brawloop`,
    template: `%s | Brawloop`,
  },
  description: siteDescription,
  applicationName: "Brawloop",
  authors: [{ name: "Brawloop" }],
  creator: "Brawloop",
  publisher: "Brawloop",
  alternates: {
    canonical: "/",
    languages: localeAlternates("/"),
  },
  openGraph: {
    title: `${siteName} | Brawloop`,
    description: siteDescription,
    url: siteUrl,
    siteName: "Brawloop",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${siteName} | Brawloop`,
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
    name: "Brawloop",
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
        <Suspense fallback={null}><UsageSessionTracker /></Suspense>
        {children}
      </body>
    </html>
  );
}
