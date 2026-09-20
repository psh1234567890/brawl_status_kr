import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Home from "../page";
import {
  isLocalizedLocale,
  localeAlternates,
  type LocalizedLocale,
} from "../../i18n/config";

const homeSeo: Record<
  LocalizedLocale,
  { title: string; description: string; openGraphLocale: string }
> = {
  en: {
    title: "Brawl Stars Stats, Meta & Player Search",
    description:
      "Search Brawl Stars players, review recent battles and owned brawlers, and explore sample-based map meta, team compositions, and counters.",
    openGraphLocale: "en_US",
  },
  ja: {
    title: "ブロスタ戦績・メタ分析",
    description:
      "ブロスタのプレイヤー戦績、最近のバトル、所持ブロウラー、マップメタ、チーム編成、カウンターを確認できます。",
    openGraphLocale: "ja_JP",
  },
  "pt-br": {
    title: "Estatísticas, meta e busca de jogadores de Brawl Stars",
    description:
      "Pesquise jogadores de Brawl Stars, veja batalhas recentes e brawlers obtidos e explore meta por mapa, composições de equipe e counters.",
    openGraphLocale: "pt_BR",
  },
  es: {
    title: "Estadísticas, meta y búsqueda de jugadores de Brawl Stars",
    description:
      "Busca jugadores de Brawl Stars, consulta batallas recientes y brawlers obtenidos y explora el meta por mapa, composiciones y counters.",
    openGraphLocale: "es_ES",
  },
  tr: {
    title: "Brawl Stars İstatistikleri, Meta ve Oyuncu Arama",
    description:
      "Brawl Stars oyuncularını ara, son savaşları ve sahip olunan savaşçıları incele; harita metası, takım dizilimleri ve counter verilerini keşfet.",
    openGraphLocale: "tr_TR",
  },
  de: {
    title: "Brawl Stars Statistiken, Meta & Spielersuche",
    description:
      "Suche Brawl-Stars-Spieler, prüfe letzte Kämpfe und eigene Brawler und entdecke Karten-Meta, Team-Kombinationen und Counter.",
    openGraphLocale: "de_DE",
  },
  fr: {
    title: "Statistiques Brawl Stars, méta et recherche de joueurs",
    description:
      "Recherchez des joueurs Brawl Stars, consultez les combats récents et les brawlers obtenus, puis explorez la méta des cartes, les compositions et les counters.",
    openGraphLocale: "fr_FR",
  },
  it: {
    title: "Statistiche Brawl Stars, meta e ricerca giocatori",
    description:
      "Cerca giocatori di Brawl Stars, consulta le battaglie recenti e i brawler posseduti ed esplora meta delle mappe, composizioni e counter.",
    openGraphLocale: "it_IT",
  },
  ru: {
    title: "Статистика Brawl Stars, мета и поиск игроков",
    description:
      "Ищите игроков Brawl Stars, смотрите недавние бои и полученных бойцов, а также изучайте мету карт, составы команд и контрпики.",
    openGraphLocale: "ru_RU",
  },
};

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  const { title, description, openGraphLocale } = homeSeo[lang];

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
      locale: openGraphLocale,
      type: "website",
    },
  };
}

export default async function LocalizedHomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocalizedLocale(lang)) notFound();
  return <Home locale={lang} />;
}
