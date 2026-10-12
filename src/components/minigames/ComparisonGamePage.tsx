import PortalLayout from "../PortalLayout";
import ComparisonQuiz from "./ComparisonQuiz";
import { getBlockedCopy } from "../../i18n/minigames/blockedGameMessages";
import type { Locale } from "../../i18n/config";
import { loadComparisonEntries } from "../../server/comparisonGames";

export default async function ComparisonGamePage({ locale, kind }: {
  locale: Locale;
  kind: "higher-lower" | "release-order";
}) {
  const copy = getBlockedCopy(locale, kind);
  const entries = await loadComparisonEntries(kind, locale);
  return (
    <PortalLayout locale={locale} eyebrow="Mini Games" title={copy.title} description={copy.description}>
      <ComparisonQuiz locale={locale} kind={kind} entries={entries} />
    </PortalLayout>
  );
}
