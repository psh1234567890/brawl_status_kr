import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortalLayout from "../../../components/PortalLayout";
import PlayerComparison from "../../../components/PlayerComparison";
import { isLocalizedLocale, localeAlternates } from "../../../i18n/config";
import { getComparisonMessages } from "../../../i18n/playerComparisonMessages";
import { validatedComparisonTags } from "../../../utils/playerComparison";

export async function generateMetadata({ params }: PageProps<"/[lang]/compare">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const copy = getComparisonMessages(lang);
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: "/" + lang + "/compare", languages: localeAlternates("/compare") },
  };
}

export default async function LocalizedComparePage({ params, searchParams }: PageProps<"/[lang]/compare">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const query = await searchParams;
  const tags = validatedComparisonTags(
    typeof query.a === "string" ? query.a : "",
    typeof query.b === "string" ? query.b : "",
  );
  const copy = getComparisonMessages(lang);
  return <PortalLayout locale={lang} title={copy.title} eyebrow={copy.eyebrow} description={copy.description}>
    <PlayerComparison locale={lang} initialA={tags?.left} initialB={tags?.right}/>
  </PortalLayout>;
}
