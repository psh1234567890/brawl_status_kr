import type { Metadata } from "next";
import { notFound } from "next/navigation";
import UnavailableGame from "../../../../components/minigames/UnavailableGame";
import { isLocalizedLocale } from "../../../../i18n/config";
import { getMiniGameMetadata } from "../../../../utils/minigames/metadata";

export const revalidate = 3600;
type Props = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return getMiniGameMetadata(lang, "release-order");
}
export default async function Page({ params }: Props) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <UnavailableGame locale={lang} id="release-order" />;
}
