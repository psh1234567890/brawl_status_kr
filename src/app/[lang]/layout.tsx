import { notFound } from "next/navigation";
import LocaleHtmlSync from "../../components/LocaleHtmlSync";
import { isLocalizedLocale, localizedLocales } from "../../i18n/config";

export function generateStaticParams() {
  return localizedLocales.map((lang) => ({ lang }));
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
