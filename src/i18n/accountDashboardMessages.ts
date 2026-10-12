import type { Locale } from "./config";

type DashboardCopy = {
  searchMine: string; title: string; subtitle: string; profile: string; player: string;
  loading: string; unavailable: string; noTag: string; configure: string;
  trophies: string; highest: string; victories: string; brawlers: string;
  myPlayer: string; openSearch: string; personalBests: string; noBests: string;
  rankings: string; noRanks: string; today: string; week: string; all: string;
  rank: string; unranked: string; recent: string; browserOnly: string;
  noRecent: string; recentBests: string; noActivity: string; edit: string;
};
const ko: DashboardCopy = {
  searchMine: "내 대표 태그 바로 검색", title: "마이페이지 대시보드",
  subtitle: "내 플레이어 정보, 개인 최고기록, 서버 검증 순위를 한눈에 확인해.",
  profile: "계정", player: "대표 태그", loading: "불러오는 중…", unavailable: "현재 플레이어 정보를 불러올 수 없어.",
  noTag: "대표 태그를 아직 등록하지 않았어.", configure: "아래 계정 설정에서 대표 태그를 등록해 줘.",
  trophies: "현재 트로피", highest: "최고 트로피", victories: "3대3 승리", brawlers: "보유 브롤러",
  myPlayer: "내 플레이어", openSearch: "플레이어 검색 화면으로 이동",
  personalBests: "미니게임 개인 최고기록", noBests: "아직 동기화된 기록이 없어.",
  rankings: "내 서버 검증 랭킹", noRanks: "해당 기간 참가 기록 없음", today: "오늘", week: "최근 7일", all: "전체",
  rank: "위", unranked: "기록 없음", recent: "이 기기의 최근 검색 태그",
  browserOnly: "최근 검색은 이 브라우저에만 저장돼. 계정 활동 추적 기록이 아니야.",
  noRecent: "아직 이 기기에서 검색한 태그가 없어.", recentBests: "최근 최고기록 갱신",
  noActivity: "최근 갱신된 개인 최고기록이 없어.", edit: "프로필 설정",
};
const en: DashboardCopy = {
  searchMine: "Search my saved player tag", title: "My dashboard",
  subtitle: "View your saved player, personal bests and server-verified rankings together.",
  profile: "Account", player: "Saved tag", loading: "Loading…", unavailable: "Player data is temporarily unavailable.",
  noTag: "No saved player tag yet.", configure: "Add your tag in the account settings below.",
  trophies: "Trophies", highest: "Highest trophies", victories: "3v3 wins", brawlers: "Brawlers",
  myPlayer: "My player", openSearch: "Go to player search", personalBests: "Mini Game personal bests",
  noBests: "No synced personal bests yet.", rankings: "My verified ranks",
  noRanks: "No ranked result in this period", today: "Today", week: "Last 7 days", all: "All time",
  rank: "rank", unranked: "No result", recent: "Recent searches on this device",
  browserOnly: "Recent searches belong only to this browser, not a server-side account activity log.",
  noRecent: "No searches on this device yet.", recentBests: "Latest best-score updates",
  noActivity: "No recent personal-best updates.", edit: "Account settings",
};
export const accountDashboardMessages: Record<Locale, DashboardCopy> = {
  ko, en,
  ja: { ...en, searchMine: "登録タグを検索", title: "マイページ", subtitle: "プレイヤー情報、自己ベストとランキングを確認", recent: "この端末の最近の検索", browserOnly: "検索履歴はこのブラウザだけに保存されます。" },
  "pt-br": { ...en, searchMine: "Buscar minha tag", title: "Meu painel", recent: "Buscas neste dispositivo", browserOnly: "As buscas recentes ficam apenas neste navegador." },
  es: { ...en, searchMine: "Buscar mi etiqueta", title: "Mi panel", recent: "Búsquedas en este dispositivo", browserOnly: "Las búsquedas recientes solo se guardan en este navegador." },
  tr: { ...en, searchMine: "Kayıtlı etiketimi ara", title: "Panelim", recent: "Bu cihazdaki son aramalar", browserOnly: "Son aramalar yalnızca bu tarayıcıda saklanır." },
  de: { ...en, searchMine: "Meinen Tag suchen", title: "Mein Dashboard", recent: "Letzte Suchen auf diesem Gerät", browserOnly: "Suchverlauf bleibt ausschließlich in diesem Browser." },
  fr: { ...en, searchMine: "Rechercher mon tag", title: "Mon tableau de bord", recent: "Recherches sur cet appareil", browserOnly: "Les recherches récentes restent uniquement dans ce navigateur." },
  it: { ...en, searchMine: "Cerca il mio tag", title: "La mia dashboard", recent: "Ricerche su questo dispositivo", browserOnly: "Le ricerche recenti restano solo in questo browser." },
  ru: { ...en, searchMine: "Найти мой тег", title: "Моя панель", recent: "Поиски на этом устройстве", browserOnly: "Недавние запросы хранятся только в этом браузере." },
};
