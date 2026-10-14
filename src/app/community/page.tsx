import type { Metadata } from "next";
import PortalLayout from "../../components/PortalLayout";
import { CommunityBoard } from "../../components/community/Community";
import { getCommunityMessages } from "../../i18n/communityMessages";
import type { Locale } from "../../i18n/config";
export const metadata: Metadata = { title: "경기 제보 커뮤니티", robots: { index: false, follow: false } };
export function CommunityPageContent({ locale }: { locale: Locale }) {
  const copy = getCommunityMessages(locale);
  return <PortalLayout locale={locale} title={copy.title} description={copy.description}><CommunityBoard locale={locale} /></PortalLayout>;
}
export default function CommunityPage() { return <CommunityPageContent locale="ko" />; }
