import { notFound } from "next/navigation";
import LocaleHtmlSync from "../../components/LocaleHtmlSync";
import { isLocalizedLocale } from "../../i18n/config";

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "ja" }];
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
