import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortalLayout from "../../../components/PortalLayout";
import AccountPageView from "../../../components/account/AccountPageView";
import { getAccountMessages } from "../../../i18n/accountMessages";
import { isLocale, localeAlternates } from "../../../i18n/config";

type AccountPageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: AccountPageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return { robots: { index: false, follow: false } };
  const copy = getAccountMessages(lang);
  return {
    title: copy.accountTitle,
    description: copy.accountDescription,
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false, noarchive: true },
    },
    alternates: {
      canonical: `/${lang}/account`,
      languages: localeAlternates("/account"),
    },
  };
}

export default async function LocalizedAccountPage({ params }: AccountPageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const copy = getAccountMessages(lang);
  return (
    <PortalLayout title={copy.accountTitle} description={copy.accountDescription} locale={lang}>
      <AccountPageView locale={lang} />
    </PortalLayout>
  );
}
