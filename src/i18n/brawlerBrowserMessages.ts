import { numberLocales, type Locale } from "./config";

type BrawlerBrowserCopy = {
  searchPlaceholder: string;
  searchAria: string;
  rarityFilterAria: string;
  classFilterAria: string;
  allRarities: string;
  allClasses: string;
  noResults: string;
};

const copy: Record<Locale, BrawlerBrowserCopy> = {
  ko: {
    searchPlaceholder: "브롤러 이름 검색",
    searchAria: "브롤러 이름 검색",
    rarityFilterAria: "브롤러 희귀도 필터",
    classFilterAria: "브롤러 역할 필터",
    allRarities: "전체 희귀도",
    allClasses: "전체 역할",
    noResults: "조건에 맞는 브롤러가 없습니다.",
  },
  en: {
    searchPlaceholder: "Search brawlers",
    searchAria: "Search brawlers",
    rarityFilterAria: "Brawler rarity filter",
    classFilterAria: "Brawler class filter",
    allRarities: "All rarities",
    allClasses: "All classes",
    noResults: "No brawlers match these filters.",
  },
  ja: {
    searchPlaceholder: "ブロウラー名を検索",
    searchAria: "ブロウラー名を検索",
    rarityFilterAria: "レア度フィルター",
    classFilterAria: "役割フィルター",
    allRarities: "すべてのレア度",
    allClasses: "すべての役割",
    noResults: "条件に一致するブロウラーがありません。",
  },
  "pt-br": {
    searchPlaceholder: "Buscar brawlers",
    searchAria: "Buscar brawlers",
    rarityFilterAria: "Filtro de raridade",
    classFilterAria: "Filtro de classe",
    allRarities: "Todas as raridades",
    allClasses: "Todas as classes",
    noResults: "Nenhum brawler corresponde aos filtros.",
  },
  es: {
    searchPlaceholder: "Buscar brawlers",
    searchAria: "Buscar brawlers",
    rarityFilterAria: "Filtro de rareza",
    classFilterAria: "Filtro de clase",
    allRarities: "Todas las rarezas",
    allClasses: "Todas las clases",
    noResults: "No hay brawlers que coincidan con los filtros.",
  },
  tr: {
    searchPlaceholder: "Savaşçı ara",
    searchAria: "Savaşçı ara",
    rarityFilterAria: "Nadirlik filtresi",
    classFilterAria: "Rol filtresi",
    allRarities: "Tüm nadirlikler",
    allClasses: "Tüm roller",
    noResults: "Filtrelere uyan savaşçı yok.",
  },
  de: {
    searchPlaceholder: "Brawler suchen",
    searchAria: "Brawler suchen",
    rarityFilterAria: "Seltenheitsfilter",
    classFilterAria: "Klassenfilter",
    allRarities: "Alle Seltenheiten",
    allClasses: "Alle Klassen",
    noResults: "Keine Brawler entsprechen den Filtern.",
  },
  fr: {
    searchPlaceholder: "Rechercher des brawlers",
    searchAria: "Rechercher des brawlers",
    rarityFilterAria: "Filtre de rareté",
    classFilterAria: "Filtre de rôle",
    allRarities: "Toutes les raretés",
    allClasses: "Tous les rôles",
    noResults: "Aucun brawler ne correspond aux filtres.",
  },
  it: {
    searchPlaceholder: "Cerca brawler",
    searchAria: "Cerca brawler",
    rarityFilterAria: "Filtro rarità",
    classFilterAria: "Filtro ruolo",
    allRarities: "Tutte le rarità",
    allClasses: "Tutti i ruoli",
    noResults: "Nessun brawler corrisponde ai filtri.",
  },
  ru: {
    searchPlaceholder: "Поиск бойцов",
    searchAria: "Поиск бойцов",
    rarityFilterAria: "Фильтр редкости",
    classFilterAria: "Фильтр роли",
    allRarities: "Все редкости",
    allClasses: "Все роли",
    noResults: "Нет бойцов, подходящих под фильтры.",
  },
};

export function getBrawlerBrowserMessages(locale: Locale) {
  return copy[locale];
}

export function formatBrawlerResultCount(locale: Locale, count: number) {
  const value = count.toLocaleString(numberLocales[locale]);
  if (locale === "ko") return value + "명";
  if (locale === "ja") return value + "体";
  if (locale === "pt-br") return value + " brawlers";
  if (locale === "es") return value + " brawlers";
  if (locale === "tr") return value + " savaşçı";
  if (locale === "de") return value + " Brawler";
  if (locale === "fr") return value + " brawlers";
  if (locale === "it") return value + " brawler";
  if (locale === "ru") return value + " бойцов";
  return value + " brawlers";
}
