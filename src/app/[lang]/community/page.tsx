import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityPageContent } from "../../community/page";
import { isLocalizedLocale } from "../../../i18n/config";
import { getCommunityMessages } from "../../../i18n/communityMessages";
type Props = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return { title: getCommunityMessages(lang).title, robots: { index: false, follow: false } };
}
export default async function LocalizedCommunity({ params }: Props) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <CommunityPageContent locale={lang} />;
}
