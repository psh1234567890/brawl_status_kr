import type { Metadata } from "next";
import PortalLayout from "../../components/PortalLayout";
import AccountPageView from "../../components/account/AccountPageView";
import { getAccountMessages } from "../../i18n/accountMessages";
import { localeAlternates } from "../../i18n/config";

const copy = getAccountMessages("ko");

export const metadata: Metadata = {
  title: copy.accountTitle,
  description: copy.accountDescription,
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noarchive: true },
  },
  alternates: { canonical: "/account", languages: localeAlternates("/account") },
};

export default function AccountPage() {
  return (
    <PortalLayout title={copy.accountTitle} description={copy.accountDescription} locale="ko">
      <AccountPageView locale="ko" />
    </PortalLayout>
  );
}
