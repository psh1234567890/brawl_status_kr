import type { Metadata } from "next";
import Link from "next/link";
import BrawlerNameQuiz from "../../../components/minigames/BrawlerNameQuiz";
import PortalLayout from "../../../components/PortalLayout";
import { localizedHref, type Locale } from "../../../i18n/config";
import { getMinigameMessages } from "../../../i18n/minigameMessages";
import { loadNameQuizBrawlers } from "../../../server/minigames";
import { getMiniGameMetadata } from "../../../utils/minigames/metadata";

export const revalidate = 3600;

export const metadata: Metadata = getMiniGameMetadata("ko", "brawler-quiz");

export default function BrawlerQuizPage() {
  return <BrawlerQuizContent locale="ko" />;
}

export async function BrawlerQuizContent({ locale }: { locale: Locale }) {
  const copy = getMinigameMessages(locale);
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
      <BrawlerNameQuiz key={locale} locale={locale} brawlers={quizBrawlers} />
    </PortalLayout>
  );
}
