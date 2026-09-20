import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MetaDashboard from "../../meta/page";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getMessages } from "../../../i18n/messages";

export async function generateMetadata({ params }: PageProps<"/[lang]/meta">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getMessages(lang).meta;

  return {
    title: copy.title,
    description: copy.subtitle,
    alternates: {
      canonical: `/${lang}/meta`,
      languages: localeAlternates("/meta"),
    },
  };
}

export default async function LocalizedMetaPage({ params }: PageProps<"/[lang]/meta">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <MetaDashboard locale={lang} />;
}
