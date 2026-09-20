import type { Metadata } from "next";
import ClubSearch from "../../components/ClubSearch";
import PortalLayout from "../../components/PortalLayout";
import { localeAlternates, type Locale } from "../../i18n/config";
import { getCatalogPageMessages } from "../../i18n/catalogPageMessages";

const koCopy = getCatalogPageMessages("ko").clubs;

export const metadata: Metadata = {
  title: koCopy.metadata.title,
  description: koCopy.metadata.description,
  alternates: { canonical: "/clubs", languages: localeAlternates("/clubs") },
};

export default function ClubsPage() {
  return <ClubsPageContent locale="ko" />;
}

export function ClubsPageContent({ locale }: { locale: Locale }) {
  const copy = getCatalogPageMessages(locale).clubs;
  return (
    <PortalLayout
      locale={locale}
      title={copy.title}
      eyebrow={copy.eyebrow}
      description={copy.description}
    >
      <ClubSearch locale={locale} />
    </PortalLayout>
  );
}
