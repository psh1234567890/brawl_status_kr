import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocaleHtmlSync from "../../components/LocaleHtmlSync";
import { isLocalizedLocale, localizedLocales } from "../../i18n/config";
import { getLocalizedSocialMetadata } from "../../i18n/seo";

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

  return (
    <div lang={lang}>
      <LocaleHtmlSync locale={lang} />
      {children}
    </div>
  );
}
