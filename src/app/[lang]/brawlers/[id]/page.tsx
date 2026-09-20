import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BrawlerDetailPageContent,
  getBrawlerDetailMetadata,
} from "../../../brawlers/[id]/page";
import { isLocalizedLocale } from "../../../../i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/brawlers/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return getBrawlerDetailMetadata(id, lang);
}

export default async function LocalizedBrawlerDetailPage({ params }: PageProps<"/[lang]/brawlers/[id]">) {
  const { lang, id } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <BrawlerDetailPageContent id={id} locale={lang} />;
}
