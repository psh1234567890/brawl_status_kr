import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrawlerQuizContent } from "../../../minigames/brawler-quiz/page";
import { isLocalizedLocale, localeAlternates } from "../../../../i18n/config";
import { getMinigameMessages } from "../../../../i18n/minigameMessages";

export const revalidate = 3600;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getMinigameMessages(lang);
  return {
    title: `${copy.quizTitle} | ${copy.hubTitle}`,
    description: copy.quizMetaDescription,
    alternates: { canonical: `/${lang}/minigames/brawler-quiz`, languages: localeAlternates("/minigames/brawler-quiz") },
  };
}

export default async function LocalizedBrawlerQuizPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <BrawlerQuizContent locale={lang} />;
}
