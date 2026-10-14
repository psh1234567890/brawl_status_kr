import type { Metadata } from "next";
import PortalLayout from "../../../components/PortalLayout";
import { CommunityModeration } from "../../../components/community/Community";
export const metadata: Metadata = { title: "커뮤니티 검토", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function CommunityModerationPage() {
  return <PortalLayout title="커뮤니티 검토" description="글·댓글의 증거와 맥락을 검토하고 공개 여부를 결정합니다."><CommunityModeration /></PortalLayout>;
}
