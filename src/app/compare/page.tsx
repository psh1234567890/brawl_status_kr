import type { Metadata } from "next";
import PortalLayout from "../../components/PortalLayout";
import PlayerComparison from "../../components/PlayerComparison";
import { getComparisonMessages } from "../../i18n/playerComparisonMessages";
import { localeAlternates } from "../../i18n/config";
import { comparisonPrefillTags } from "../../utils/playerComparison";

const copy = getComparisonMessages("ko");
export const metadata: Metadata = {
  title: copy.title,
  description: copy.description,
  alternates: { canonical: "/compare", languages: localeAlternates("/compare") },
};

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const params = await searchParams;
  const tags = comparisonPrefillTags(
    typeof params.a === "string" ? params.a : "",
    typeof params.b === "string" ? params.b : "",
  );
  return <PortalLayout title={copy.title} eyebrow={copy.eyebrow} description={copy.description}>
    <PlayerComparison initialA={tags.left} initialB={tags.right}/>
  </PortalLayout>;
}
