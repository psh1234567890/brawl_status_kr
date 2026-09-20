import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  GameModeDetailPageContent,
  getGameModeDetailMetadata,
} from "../../../gamemodes/[id]/page";
import { isLocalizedLocale } from "../../../../i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/gamemodes/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return getGameModeDetailMetadata(id, lang);
}

export default async function LocalizedGameModeDetailPage({ params }: PageProps<"/[lang]/gamemodes/[id]">) {
  const { lang, id } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <GameModeDetailPageContent id={id} locale={lang} />;
}
