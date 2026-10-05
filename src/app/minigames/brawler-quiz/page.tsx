import type { Metadata } from "next";
import Link from "next/link";
import BrawlerNameQuiz from "../../../components/minigames/BrawlerNameQuiz";
import PortalLayout from "../../../components/PortalLayout";
import { localizedHref, type Locale } from "../../../i18n/config";
import { getMinigameMessages } from "../../../i18n/minigameMessages";
import { getMessages } from "../../../i18n/messages";
import { brawlerQuizGuideMessages } from "../../../i18n/minigames/brawlerQuizGuideMessages";
import { loadNameQuizBrawlers } from "../../../server/minigames";
import { getMiniGameMetadata } from "../../../utils/minigames/metadata";
import { getBrawlerQuizStructuredData } from "../../../utils/minigames/brawlerQuizSeo";

export const revalidate = 3600;

export const metadata: Metadata = getMiniGameMetadata("ko", "brawler-quiz");

export default function BrawlerQuizPage() {
  return <BrawlerQuizContent locale="ko" />;
}

export async function BrawlerQuizContent({ locale }: { locale: Locale }) {
  const copy = getMinigameMessages(locale);
  const guide = brawlerQuizGuideMessages[locale];
  const common = getMessages(locale).common;
  const quizBrawlers = await loadNameQuizBrawlers(locale);

  return (
    <PortalLayout
      locale={locale}
      eyebrow={copy.nav}
      title={copy.quizTitle}
      description={copy.quizDescription}
      actions={
        <Link href={localizedHref(locale, "/minigames")} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:border-blue-300 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
          {copy.backToHub}
        </Link>
      }
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(getBrawlerQuizStructuredData(locale)).replace(/</g, "\\u003c"),
      }} />
      <nav aria-label={guide.searchLabel} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-slate-500">
        <Link href={localizedHref(locale, "/")} className="hover:text-blue-700">{common.home}</Link>
        <span aria-hidden="true">/</span>
        <Link href={localizedHref(locale, "/minigames")} className="hover:text-blue-700">{copy.hubTitle}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{copy.quizTitle}</span>
      </nav>
      <BrawlerNameQuiz key={locale} locale={locale} brawlers={quizBrawlers} />
      <section aria-labelledby="brawler-quiz-guide" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 id="brawler-quiz-guide" className="text-xl font-black text-slate-950">{guide.title}</h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
          {[
            [guide.rulesTitle, guide.rules],
            [guide.scoringTitle, guide.scoring],
            [guide.recordsTitle, guide.records],
          ].map(([title, description]) => (
            <div key={title}>
              <h3 className="font-black text-slate-900">{title}</h3>
              <p className="mt-1">{description}</p>
            </div>
          ))}
        </div>
        <Link href={localizedHref(locale, "/brawlers")} className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-blue-700 underline underline-offset-4 hover:text-blue-900">{guide.catalogLink}</Link>
      </section>
    </PortalLayout>
  );
}
