import type { Metadata } from "next";
import { DocumentArticlePage } from "../../components/DocumentPageView";
import { localeAlternates, type Locale } from "../../i18n/config";
import { getDocumentPageMessages } from "../../i18n/documentPageMessages";

const koCopy = getDocumentPageMessages("ko").terms;
export const metadata: Metadata = {
  title: koCopy.metadata.title,
  description: koCopy.metadata.description,
  alternates: {
    canonical: "/terms",
    languages: localeAlternates("/terms"),
  },
};

export default function TermsPage() {
  return <TermsPageContent locale="ko" />;
}

export function TermsPageContent({ locale }: { locale: Locale }) {
  return <DocumentArticlePage locale={locale} pageKey="terms" />;
}
