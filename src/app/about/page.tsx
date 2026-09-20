import type { Metadata } from "next";
import { DocumentArticlePage } from "../../components/DocumentPageView";
import { localeAlternates, type Locale } from "../../i18n/config";
import { getDocumentPageMessages } from "../../i18n/documentPageMessages";

const koCopy = getDocumentPageMessages("ko").about;
export const metadata: Metadata = {
  title: koCopy.metadata.title,
  description: koCopy.metadata.description,
  alternates: {
    canonical: "/about",
    languages: localeAlternates("/about"),
  },
};

export default function AboutPage() {
  return <AboutPageContent locale="ko" />;
}

export function AboutPageContent({ locale }: { locale: Locale }) {
  return <DocumentArticlePage locale={locale} pageKey="about" />;
}
