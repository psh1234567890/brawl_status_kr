import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrawlerQuizContent } from "../../../minigames/brawler-quiz/page";
import { isLocalizedLocale } from "../../../../i18n/config";
import { getMiniGameMetadata } from "../../../../utils/minigames/metadata";

export const revalidate = 3600;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return getMiniGameMetadata(lang, "brawler-quiz");
}

export default async function LocalizedBrawlerQuizPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <BrawlerQuizContent locale={lang} />;
}
