import type { Locale } from "./config";

type PersonalizedMetaCopy = {
  title: string;
  description: string;
  noRecentPlayer: string;
  searchPlayer: string;
  loading: string;
  unavailable: string;
  noMatches: string;
  score: string;
  trophies: string;
  power: string;
};

const copy: Record<Locale, PersonalizedMetaCopy> = {
  ko: {
    title: "내 보유 브롤러 추천",
    description: "최근 검색한 플레이어의 보유 브롤러 중 이 맵에서 추천 점수가 높은 순서입니다.",
    noRecentPlayer: "플레이어를 먼저 검색하면 내가 가진 브롤러만 추려서 추천해드려요.",
    searchPlayer: "플레이어 검색하기",
    loading: "내 보유 브롤러를 불러오는 중...",
    unavailable: "최근 검색한 플레이어 정보를 불러오지 못했습니다.",
    noMatches: "현재 필터 조건에서 추천할 수 있는 보유 브롤러가 없습니다.",
    score: "추천 점수",
    trophies: "트로피",
    power: "파워",
  },
  en: {
    title: "Picks from your brawlers",
    description: "Top recommendations for this map from the brawlers owned by your most recently searched player.",
    noRecentPlayer: "Search a player first to see recommendations limited to brawlers they own.",
    searchPlayer: "Search a player",
    loading: "Loading your owned brawlers...",
    unavailable: "Could not load the recently searched player.",
    noMatches: "None of the owned brawlers match the current filters.",
    score: "Score",
    trophies: "Trophies",
    power: "Power",
  },
  ja: {
    title: "所持ブロウラーからおすすめ",
    description: "直近に検索したプレイヤーの所持ブロウラーから、このマップでおすすめ度の高い順に表示します。",
    noRecentPlayer: "先にプレイヤーを検索すると、所持ブロウラーだけに絞っておすすめを表示できます。",
    searchPlayer: "プレイヤーを検索",
    loading: "所持ブロウラーを読み込み中...",
    unavailable: "直近に検索したプレイヤーを読み込めませんでした。",
    noMatches: "現在の条件に一致する所持ブロウラーがありません。",
    score: "おすすめスコア",
    trophies: "トロフィー",
    power: "パワー",
  },
  "pt-br": {
    title: "Recomendações dos seus brawlers",
    description: "Melhores escolhas para este mapa entre os brawlers do jogador pesquisado mais recentemente.",
    noRecentPlayer: "Pesquise um jogador primeiro para filtrar as recomendações pelos brawlers que ele possui.",
    searchPlayer: "Pesquisar jogador",
    loading: "Carregando seus brawlers...",
    unavailable: "Não foi possível carregar o jogador pesquisado recentemente.",
    noMatches: "Nenhum brawler possuído corresponde aos filtros atuais.",
    score: "Pontuação",
    trophies: "Troféus",
    power: "Poder",
  },
  es: {
    title: "Recomendaciones de tus brawlers",
    description: "Mejores opciones para este mapa entre los brawlers del jugador buscado más recientemente.",
    noRecentPlayer: "Busca primero un jugador para limitar las recomendaciones a sus brawlers.",
    searchPlayer: "Buscar jugador",
    loading: "Cargando tus brawlers...",
    unavailable: "No se pudo cargar el jugador buscado recientemente.",
    noMatches: "Ningún brawler disponible coincide con los filtros actuales.",
    score: "Puntuación",
    trophies: "Trofeos",
    power: "Fuerza",
  },
  tr: {
    title: "Sahip olduğun savaşçılardan öneriler",
    description: "En son aranan oyuncunun sahip olduğu savaşçılar arasından bu harita için en iyi seçimler.",
    noRecentPlayer: "Sahip olunan savaşçılara göre öneri görmek için önce bir oyuncu ara.",
    searchPlayer: "Oyuncu ara",
    loading: "Sahip olunan savaşçılar yükleniyor...",
    unavailable: "Son aranan oyuncu yüklenemedi.",
    noMatches: "Mevcut filtrelere uyan sahip olunan savaşçı yok.",
    score: "Öneri puanı",
    trophies: "Kupa",
    power: "Güç",
  },
  de: {
    title: "Empfehlungen aus deinen Brawlern",
    description: "Die besten Picks für diese Karte aus den Brawlern des zuletzt gesuchten Spielers.",
    noRecentPlayer: "Suche zuerst einen Spieler, um Empfehlungen auf dessen Brawler zu beschränken.",
    searchPlayer: "Spieler suchen",
    loading: "Eigene Brawler werden geladen...",
    unavailable: "Der zuletzt gesuchte Spieler konnte nicht geladen werden.",
    noMatches: "Keine eigenen Brawler entsprechen den aktuellen Filtern.",
    score: "Empfehlungswert",
    trophies: "Trophäen",
    power: "Power",
  },
  fr: {
    title: "Recommandations parmi vos brawlers",
    description: "Les meilleurs choix pour cette carte parmi les brawlers du joueur recherché le plus récemment.",
    noRecentPlayer: "Recherchez d’abord un joueur pour limiter les recommandations aux brawlers qu’il possède.",
    searchPlayer: "Rechercher un joueur",
    loading: "Chargement de vos brawlers...",
    unavailable: "Impossible de charger le joueur recherché récemment.",
    noMatches: "Aucun brawler possédé ne correspond aux filtres actuels.",
    score: "Score",
    trophies: "Trophées",
    power: "Pouvoir",
  },
  it: {
    title: "Consigli tra i tuoi brawler",
    description: "Le migliori scelte per questa mappa tra i brawler del giocatore cercato più di recente.",
    noRecentPlayer: "Cerca prima un giocatore per limitare i consigli ai brawler che possiede.",
    searchPlayer: "Cerca giocatore",
    loading: "Caricamento dei brawler posseduti...",
    unavailable: "Impossibile caricare il giocatore cercato di recente.",
    noMatches: "Nessun brawler posseduto corrisponde ai filtri attuali.",
    score: "Punteggio",
    trophies: "Trofei",
    power: "Potenza",
  },
  ru: {
    title: "Рекомендации из ваших бойцов",
    description: "Лучшие варианты для этой карты среди бойцов последнего найденного игрока.",
    noRecentPlayer: "Сначала найдите игрока, чтобы показывать рекомендации только из его бойцов.",
    searchPlayer: "Найти игрока",
    loading: "Загрузка бойцов игрока...",
    unavailable: "Не удалось загрузить последнего найденного игрока.",
    noMatches: "Среди имеющихся бойцов нет подходящих под текущие фильтры.",
    score: "Оценка",
    trophies: "Трофеи",
    power: "Сила",
  },
};

export function getPersonalizedMetaMessages(locale: Locale) {
  return copy[locale];
}
