import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortalLayout from "../../../components/PortalLayout";
import { CommunityPost } from "../../../components/community/Community";
import { getCommunityMessages } from "../../../i18n/communityMessages";
import { isCommunityId } from "../../../utils/community";
import type { Locale } from "../../../i18n/config";
export const metadata: Metadata = { title: "커뮤니티 글·댓글", robots: { index: false, follow: false } };
export function CommunityPostPageContent({ id, locale }: { id: string; locale: Locale }) {
  if (!isCommunityId(id)) notFound();
  const copy = getCommunityMessages(locale);
  return <PortalLayout locale={locale} title={copy.title} description={copy.description}><CommunityPost id={id} locale={locale} /></PortalLayout>;
}
export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CommunityPostPageContent id={id} locale="ko" />;
}
