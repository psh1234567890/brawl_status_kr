import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortalLayout from "../../../components/PortalLayout";
import TeamMetaBrowser from "../../../components/TeamMetaBrowser";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getMessages } from "../../../i18n/messages";

export async function generateMetadata({ params }: PageProps<"/[lang]/teams">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getMessages(lang).teams;

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: `/${lang}/teams`,
      languages: localeAlternates("/teams"),
    },
  };
}

export default async function LocalizedTeamsPage({ params }: PageProps<"/[lang]/teams">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getMessages(lang).teams;

  return (
    <PortalLayout
      locale={lang}
      title={copy.title}
      eyebrow={copy.eyebrow}
      description={copy.description}
    >
      <TeamMetaBrowser locale={lang} />
    </PortalLayout>
  );
}
