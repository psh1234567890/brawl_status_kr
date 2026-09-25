import type { Locale } from "./config";

export type RecommendationTagSource = "selected" | "default" | "recent";

type PersonalizedMetaCopy = {
  title: string;
  description: string;
  sourceLabels: Record<RecommendationTagSource, string>;
  noPlayer: string;
  searchPlayer: string;
  loading: string;
  unavailable: string;
  noMatches: string;
  score: string;
  trophies: string;
  power: string;
};

export const personalizedMetaMessages: Record<Locale, PersonalizedMetaCopy> = {
  ko: {
    title: "플레이어 보유 브롤러 추천",
    description: "선택한 플레이어를 우선 사용하고, 없으면 계정 대표 태그, 그다음 최근 검색 플레이어를 기준으로 합니다. 태그는 소유권 인증이 아닙니다.",
    sourceLabels: { selected: "선택한 플레이어", default: "계정 대표 태그 · 소유권 미인증", recent: "최근 검색한 플레이어" },
    noPlayer: "플레이어를 검색하면 해당 플레이어의 보유 브롤러를 기준으로 추천합니다.",
    searchPlayer: "플레이어 검색하기",
    loading: "플레이어 정보를 불러오는 중...",
    unavailable: "이 플레이어 정보를 불러오지 못했습니다.",
    noMatches: "현재 필터 조건에서 추천할 수 있는 보유 브롤러가 없습니다.",
    score: "추천 점수", trophies: "트로피", power: "파워",
  },
  en: {
    title: "Recommendations from a player’s brawlers",
    description: "Uses an explicitly selected player first, then your account default tag, then the most recently searched player. A tag does not verify ownership.",
    sourceLabels: { selected: "Selected player", default: "Account default tag · ownership unverified", recent: "Most recently searched player" },
    noPlayer: "Search a player to see recommendations based on that player’s brawlers.",
    searchPlayer: "Search a player", loading: "Loading player data...", unavailable: "Could not load this player.",
    noMatches: "None of this player’s brawlers match the current filters.", score: "Score", trophies: "Trophies", power: "Power",
  },
  ja: {
    title: "プレイヤーの所持ブロウラーからおすすめ",
    description: "明示的に選択したプレイヤー、アカウントの既定タグ、最後に検索したプレイヤーの順で使用します。タグは所有権の証明ではありません。",
    sourceLabels: { selected: "選択したプレイヤー", default: "アカウント既定タグ・所有権未確認", recent: "最後に検索したプレイヤー" },
    noPlayer: "プレイヤーを検索すると、そのプレイヤーの所持ブロウラーを基準におすすめを表示します。",
    searchPlayer: "プレイヤーを検索", loading: "プレイヤー情報を読み込み中...", unavailable: "このプレイヤーを読み込めませんでした。",
    noMatches: "現在の条件に一致する所持ブロウラーがありません。", score: "スコア", trophies: "トロフィー", power: "パワー",
  },
  "pt-br": {
    title: "Recomendações com os brawlers de um jogador",
    description: "Usa primeiro o jogador selecionado, depois a tag padrão da conta e, por fim, o jogador pesquisado mais recentemente. A tag não comprova propriedade.",
    sourceLabels: { selected: "Jogador selecionado", default: "Tag padrão da conta · propriedade não verificada", recent: "Jogador pesquisado mais recentemente" },
    noPlayer: "Pesquise um jogador para ver recomendações baseadas nos brawlers dele.",
    searchPlayer: "Pesquisar jogador", loading: "Carregando dados do jogador...", unavailable: "Não foi possível carregar este jogador.",
    noMatches: "Nenhum brawler deste jogador corresponde aos filtros atuais.", score: "Pontuação", trophies: "Troféus", power: "Poder",
  },
  es: {
    title: "Recomendaciones con los brawlers de un jugador",
    description: "Primero usa el jugador seleccionado, después la etiqueta predeterminada de la cuenta y, por último, el jugador buscado más recientemente. La etiqueta no verifica la propiedad.",
    sourceLabels: { selected: "Jugador seleccionado", default: "Etiqueta predeterminada · propiedad sin verificar", recent: "Jugador buscado más recientemente" },
    noPlayer: "Busca un jugador para ver recomendaciones basadas en sus brawlers.",
    searchPlayer: "Buscar jugador", loading: "Cargando datos del jugador...", unavailable: "No se pudo cargar este jugador.",
    noMatches: "Ningún brawler de este jugador coincide con los filtros actuales.", score: "Puntuación", trophies: "Trofeos", power: "Fuerza",
  },
  tr: {
    title: "Bir oyuncunun savaşçılarına göre öneriler",
    description: "Önce açıkça seçilen oyuncu, sonra hesap varsayılan etiketi, ardından en son aranan oyuncu kullanılır. Etiket sahipliği doğrulamaz.",
    sourceLabels: { selected: "Seçilen oyuncu", default: "Hesap varsayılan etiketi · sahiplik doğrulanmadı", recent: "En son aranan oyuncu" },
    noPlayer: "Bir oyuncu arayarak onun savaşçılarına göre önerileri görebilirsin.",
    searchPlayer: "Oyuncu ara", loading: "Oyuncu bilgileri yükleniyor...", unavailable: "Bu oyuncu yüklenemedi.",
    noMatches: "Bu oyuncunun savaşçılarından mevcut filtrelere uyan yok.", score: "Puan", trophies: "Kupa", power: "Güç",
  },
  de: {
    title: "Empfehlungen anhand der Brawler eines Spielers",
    description: "Zuerst wird ein ausdrücklich ausgewählter Spieler verwendet, dann dein Standard-Tag und zuletzt der zuletzt gesuchte Spieler. Ein Tag bestätigt kein Eigentum.",
    sourceLabels: { selected: "Ausgewählter Spieler", default: "Konto-Standard-Tag · Eigentum nicht bestätigt", recent: "Zuletzt gesuchter Spieler" },
    noPlayer: "Suche einen Spieler, um Empfehlungen anhand seiner Brawler zu sehen.",
    searchPlayer: "Spieler suchen", loading: "Spielerdaten werden geladen...", unavailable: "Dieser Spieler konnte nicht geladen werden.",
    noMatches: "Keine Brawler dieses Spielers entsprechen den aktuellen Filtern.", score: "Wert", trophies: "Trophäen", power: "Power",
  },
  fr: {
    title: "Recommandations selon les brawlers d’un joueur",
    description: "Utilise d’abord le joueur sélectionné explicitement, puis le tag par défaut du compte, et enfin le joueur recherché le plus récemment. Le tag ne prouve pas la propriété.",
    sourceLabels: { selected: "Joueur sélectionné", default: "Tag par défaut du compte · propriété non vérifiée", recent: "Joueur recherché récemment" },
    noPlayer: "Recherchez un joueur pour obtenir des recommandations selon ses brawlers.",
    searchPlayer: "Rechercher un joueur", loading: "Chargement des données du joueur...", unavailable: "Impossible de charger ce joueur.",
    noMatches: "Aucun brawler de ce joueur ne correspond aux filtres actuels.", score: "Score", trophies: "Trophées", power: "Pouvoir",
  },
  it: {
    title: "Consigli basati sui brawler di un giocatore",
    description: "Usa prima il giocatore selezionato esplicitamente, poi il tag predefinito dell’account e infine l’ultimo giocatore cercato. Il tag non verifica la proprietà.",
    sourceLabels: { selected: "Giocatore selezionato", default: "Tag predefinito · proprietà non verificata", recent: "Ultimo giocatore cercato" },
    noPlayer: "Cerca un giocatore per vedere consigli basati sui suoi brawler.",
    searchPlayer: "Cerca giocatore", loading: "Caricamento dati del giocatore...", unavailable: "Impossibile caricare questo giocatore.",
    noMatches: "Nessun brawler di questo giocatore corrisponde ai filtri attuali.", score: "Punteggio", trophies: "Trofei", power: "Potenza",
  },
  ru: {
    title: "Рекомендации по бойцам игрока",
    description: "Сначала используется явно выбранный игрок, затем тег аккаунта по умолчанию и после него последний найденный игрок. Тег не подтверждает владение.",
    sourceLabels: { selected: "Выбранный игрок", default: "Тег аккаунта по умолчанию · владение не подтверждено", recent: "Последний найденный игрок" },
    noPlayer: "Найдите игрока, чтобы получить рекомендации по его бойцам.",
    searchPlayer: "Найти игрока", loading: "Загрузка данных игрока...", unavailable: "Не удалось загрузить этого игрока.",
    noMatches: "Ни один боец этого игрока не соответствует текущим фильтрам.", score: "Оценка", trophies: "Трофеи", power: "Сила",
  },
};

export function getPersonalizedMetaMessages(locale: Locale) {
  return personalizedMetaMessages[locale];
}
