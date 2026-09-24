import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AbilityOwnerQuizContent } from "../../../minigames/ability-quiz/page";
import { isLocalizedLocale } from "../../../../i18n/config";
import { getMiniGameMetadata } from "../../../../utils/minigames/metadata";

export const revalidate = 3600;
type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return getMiniGameMetadata(lang, "ability-quiz");
}

export default async function Page({ params }: Props) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <AbilityOwnerQuizContent locale={lang} />;
}
