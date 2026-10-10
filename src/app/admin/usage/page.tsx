import type { Metadata } from "next";
import UsageDashboard from "../../../components/admin/UsageDashboard";

export const metadata: Metadata = {
  title: "운영자 방문 통계",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default function AdminUsagePage() {
  return <UsageDashboard />;
}
