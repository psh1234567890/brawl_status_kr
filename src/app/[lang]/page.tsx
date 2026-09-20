import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Home from "../page";
import { isLocalizedLocale, localeAlternates } from "../../i18n/config";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();

  const title = lang === "ja" ? "ブロスタ戦績・メタ分析" : "Brawl Stars Stats, Meta & Player Search";
  const description = lang === "ja"
    ? "ブロスタのプレイヤー戦績、最近のバトル、所持ブロウラー、マップメタ、チーム編成、カウンターを確認できます。"
    : "Search Brawl Stars players, review recent battles and owned brawlers, and explore sample-based map meta, team compositions, and counters.";

  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}`,
      languages: localeAlternates("/"),
    },
    openGraph: {
      title: `${title} | Brawl Status KR`,
      description,
      url: `/${lang}`,
      locale: lang === "ja" ? "ja_JP" : "en_US",
      type: "website",
    },
  };
}

export default async function LocalizedHomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <Home locale={lang} />;
}
