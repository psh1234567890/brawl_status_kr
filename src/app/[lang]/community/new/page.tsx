import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityNewPageContent } from "../../../community/new/page";
import { isLocalizedLocale } from "../../../../i18n/config";
import { getCommunityMessages } from "../../../../i18n/communityMessages";
type Props = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return { title: getCommunityMessages(lang).write, robots: { index: false, follow: false } };
}
export default async function LocalizedCommunityNew({ params }: Props) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <CommunityNewPageContent locale={lang} />;
}
