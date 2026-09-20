import type { Metadata } from "next";
import { DocumentArticlePage } from "../../components/DocumentPageView";
import { localeAlternates, type Locale } from "../../i18n/config";
import { getDocumentPageMessages } from "../../i18n/documentPageMessages";

const koCopy = getDocumentPageMessages("ko").contact;
export const metadata: Metadata = {
  title: koCopy.metadata.title,
  description: koCopy.metadata.description,
  alternates: {
    canonical: "/contact",
    languages: localeAlternates("/contact"),
  },
};

export default function ContactPage() {
  return <ContactPageContent locale="ko" />;
}

export function ContactPageContent({ locale }: { locale: Locale }) {
  return <DocumentArticlePage locale={locale} pageKey="contact" />;
}
