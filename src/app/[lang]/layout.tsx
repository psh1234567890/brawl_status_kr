import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocaleHtmlSync from "../../components/LocaleHtmlSync";
import { isLocalizedLocale, localizedLocales, numberLocales } from "../../i18n/config";
import { getLocalizedSiteSeo, getLocalizedSocialMetadata } from "../../i18n/seo";

export function generateStaticParams() {
  return localizedLocales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return getLocalizedSocialMetadata(lang);
}

export default async function LocalizedLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const seo = getLocalizedSiteSeo(lang);
  const url = "https://www.brawl-o1.site/" + lang;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": url + "#website",
    name: "Brawl Status KR",
    url,
    inLanguage: numberLocales[lang],
    description: seo.description,
  };

  return (
    <div lang={numberLocales[lang]}>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <LocaleHtmlSync locale={lang} />
      {children}
    </div>
  );
}
