import type { Metadata } from "next";
import { MethodologyDocumentPage } from "../../components/DocumentPageView";
import { localeAlternates, type Locale } from "../../i18n/config";
import { getDocumentPageMessages } from "../../i18n/documentPageMessages";

const koCopy = getDocumentPageMessages("ko").methodology;
export const metadata: Metadata = {
  title: koCopy.metadata.title,
  description: koCopy.metadata.description,
  alternates: { canonical: "/methodology", languages: localeAlternates("/methodology") },
};

export default function MethodologyPage() {
  return <MethodologyPageContent locale="ko" />;
}

export function MethodologyPageContent({ locale }: { locale: Locale }) {
  return <MethodologyDocumentPage locale={locale} />;
}
