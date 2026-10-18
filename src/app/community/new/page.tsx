import type { Metadata } from "next";
import PortalLayout from "../../../components/PortalLayout";
import { CommunityNewPost } from "../../../components/community/Community";
import { getCommunityMessages } from "../../../i18n/communityMessages";
import type { Locale } from "../../../i18n/config";
export const metadata: Metadata = { title: "커뮤니티 글쓰기", robots: { index: false, follow: false } };
export function CommunityNewPageContent({ locale }: { locale: Locale }) {
  const copy = getCommunityMessages(locale);
  return <PortalLayout locale={locale} title={copy.write} description={copy.reviewNotice}><CommunityNewPost locale={locale} /></PortalLayout>;
}
export default function CommunityNewPage() { return <CommunityNewPageContent locale="ko" />; }
