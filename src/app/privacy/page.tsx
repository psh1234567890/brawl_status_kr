import type { Metadata } from "next";
import { DocumentArticlePage } from "../../components/DocumentPageView";
import { localeAlternates, type Locale } from "../../i18n/config";
import { getDocumentPageMessages } from "../../i18n/documentPageMessages";

const koCopy = getDocumentPageMessages("ko").privacy;
export const metadata: Metadata = {
  title: koCopy.metadata.title,
  description: koCopy.metadata.description,
  alternates: {
    canonical: "/privacy",
    languages: localeAlternates("/privacy"),
  },
};

export default function PrivacyPage() {
  return <PrivacyPageContent locale="ko" />;
}

export function PrivacyPageContent({ locale }: { locale: Locale }) {
  return <DocumentArticlePage locale={locale} pageKey="privacy" />;
}
