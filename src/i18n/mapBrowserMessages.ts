import { numberLocales, type Locale } from "./config";

type MapBrowserCopy = {
  searchPlaceholder: string;
  searchAria: string;
  modeFilterAria: string;
  allModes: string;
  loadMore: string;
  noResults: string;
  recommendation: string;
};

const copy: Record<Locale, MapBrowserCopy> = {
  ko: {
    searchPlaceholder: "맵 이름 검색",
    searchAria: "맵 이름 검색",
    modeFilterAria: "게임모드 필터",
    allModes: "전체 게임모드",
    loadMore: "맵 더 보기",
    noResults: "조건에 맞는 맵이 없습니다.",
    recommendation: "추천 브롤러",
  },
  en: {
    searchPlaceholder: "Search maps",
    searchAria: "Search maps",
    modeFilterAria: "Game mode filter",
    allModes: "All game modes",
    loadMore: "Show more maps",
    noResults: "No maps match these filters.",
    recommendation: "Brawler picks",
  },
  ja: {
    searchPlaceholder: "マップ名を検索",
    searchAria: "マップ名を検索",
    modeFilterAria: "ゲームモードフィルター",
    allModes: "すべてのゲームモード",
    loadMore: "マップをもっと見る",
    noResults: "条件に一致するマップがありません。",
    recommendation: "おすすめブロウラー",
  },
  "pt-br": {
    searchPlaceholder: "Buscar mapas",
    searchAria: "Buscar mapas",
    modeFilterAria: "Filtro de modo de jogo",
    allModes: "Todos os modos",
    loadMore: "Mostrar mais mapas",
    noResults: "Nenhum mapa corresponde aos filtros.",
    recommendation: "Brawlers recomendados",
  },
  es: {
    searchPlaceholder: "Buscar mapas",
    searchAria: "Buscar mapas",
    modeFilterAria: "Filtro de modo de juego",
    allModes: "Todos los modos",
    loadMore: "Mostrar más mapas",
    noResults: "No hay mapas que coincidan con los filtros.",
    recommendation: "Brawlers recomendados",
  },
  tr: {
    searchPlaceholder: "Harita ara",
    searchAria: "Harita ara",
    modeFilterAria: "Oyun modu filtresi",
    allModes: "Tüm oyun modları",
    loadMore: "Daha fazla harita göster",
    noResults: "Filtrelere uyan harita yok.",
    recommendation: "Savaşçı önerileri",
  },
  de: {
    searchPlaceholder: "Karten suchen",
    searchAria: "Karten suchen",
    modeFilterAria: "Spielmodusfilter",
    allModes: "Alle Spielmodi",
    loadMore: "Mehr Karten anzeigen",
    noResults: "Keine Karten entsprechen den Filtern.",
    recommendation: "Brawler-Empfehlungen",
  },
  fr: {
    searchPlaceholder: "Rechercher des cartes",
    searchAria: "Rechercher des cartes",
    modeFilterAria: "Filtre de mode de jeu",
    allModes: "Tous les modes",
    loadMore: "Afficher plus de cartes",
    noResults: "Aucune carte ne correspond aux filtres.",
    recommendation: "Brawlers recommandés",
  },
  it: {
    searchPlaceholder: "Cerca mappe",
    searchAria: "Cerca mappe",
    modeFilterAria: "Filtro modalità di gioco",
    allModes: "Tutte le modalità",
    loadMore: "Mostra altre mappe",
    noResults: "Nessuna mappa corrisponde ai filtri.",
    recommendation: "Brawler consigliati",
  },
  ru: {
    searchPlaceholder: "Поиск карт",
    searchAria: "Поиск карт",
    modeFilterAria: "Фильтр режима игры",
    allModes: "Все режимы",
    loadMore: "Показать ещё карты",
    noResults: "Нет карт, подходящих под фильтры.",
    recommendation: "Рекомендуемые бойцы",
  },
};

export function getMapBrowserMessages(locale: Locale) {
  return copy[locale];
}

export function formatMapResultCount(locale: Locale, count: number) {
  const value = count.toLocaleString(numberLocales[locale]);
  if (locale === "ko") return value + "개 맵";
  if (locale === "ja") return value + "件のマップ";
  if (locale === "pt-br") return value + " mapas";
  if (locale === "es") return value + " mapas";
  if (locale === "tr") return value + " harita";
  if (locale === "de") return value + " Karten";
  if (locale === "fr") return value + " cartes";
  if (locale === "it") return value + " mappe";
  if (locale === "ru") return value + " карт";
  return value + " maps";
}
