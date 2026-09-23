import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MiniGamesContent } from "../../minigames/page";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getMinigameMessages } from "../../../i18n/minigameMessages";

export const revalidate = 3600;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getMinigameMessages(lang);
  return {
    title: copy.hubTitle,
    description: copy.hubMetaDescription,
    alternates: { canonical: `/${lang}/minigames`, languages: localeAlternates("/minigames") },
  };
}

export default async function LocalizedMiniGamesPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <MiniGamesContent locale={lang} />;
}
