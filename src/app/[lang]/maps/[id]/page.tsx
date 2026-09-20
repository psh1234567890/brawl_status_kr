import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getMapDetailMetadata,
  MapDetailPageContent,
} from "../../../maps/[id]/page";
import { isLocalizedLocale } from "../../../../i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]/maps/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return getMapDetailMetadata(id, lang);
}

export default async function LocalizedMapDetailPage({ params }: PageProps<"/[lang]/maps/[id]">) {
  const { lang, id } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <MapDetailPageContent id={id} locale={lang} />;
}
