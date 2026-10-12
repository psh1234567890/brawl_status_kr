import type { Locale } from "./config";

export const compareNavLabels: Record<Locale, string> = {
  ko: "플레이어 비교",
  en: "Player compare",
  ja: "プレイヤー比較",
  "pt-br": "Comparar jogadores",
  es: "Comparar jugadores",
  tr: "Oyuncuları karşılaştır",
  de: "Spielervergleich",
  fr: "Comparer joueurs",
  it: "Confronta giocatori",
  ru: "Сравнить игроков",
};

const en = {
  title: "Compare Players", eyebrow: "Head to head",
  description: "Compare two Brawl Stars player profiles side by side. Data is retrieved from the public Brawl Stars API.",
  first: "Player A tag", second: "Player B tag", action: "Compare", busy: "Comparing…",
  invalid: "Enter two different valid player tags.", failed: "Profile could not be retrieved.",
  retry: "Try again", share: "Copy comparison link", copied: "Link copied", copyFailed: "Could not copy link.",
  intro: "Enter both player tags to start.", stats: "Profile comparison",
  trophy: "Trophies", peak: "Highest trophies", victory3: "3v3 wins", solo: "Solo wins",
  duo: "Duo wins", owned: "Owned Brawlers", max: "Power 11 Brawlers",
  power: "Power upgrade progress", coins: "Coins needed to Power 11",
  gadget: "Owned Gadgets", star: "Owned Star Powers", hyper: "Owned Hypercharges",
  ranked: "Current Ranked", rankedHighest: "Highest Ranked",
  noRanked: "No ranked record", top: "Top trophy Brawlers",
  caveat: "Counts are cumulative. Higher values do not prove a better player. Upgrade progress covers only currently owned Brawlers; this is not a head-to-head win-rate calculation.",
  freshnessStale: "Cached profile (possibly out of date)", tag: "Tag", notAvailable: "—",
};
const ko: typeof en = {
  title: "플레이어 비교", eyebrow: "플레이어 VS 플레이어",
  description: "두 플레이어 태그를 입력해 트로피, 승수, 브롤러 육성 상태와 경쟁전 기록을 나란히 비교해 봐.",
  first: "플레이어 A 태그", second: "플레이어 B 태그", action: "비교하기", busy: "비교 중…",
  invalid: "서로 다른 올바른 플레이어 태그 두 개를 입력해 줘.", failed: "프로필을 불러오지 못했어.",
  retry: "다시 비교", share: "비교 링크 복사", copied: "링크 복사 완료", copyFailed: "링크를 복사하지 못했어.",
  intro: "두 플레이어 태그를 입력하면 비교 결과가 표시돼.", stats: "프로필 비교",
  trophy: "현재 트로피", peak: "최고 트로피", victory3: "3대3 승리", solo: "솔로 승리",
  duo: "듀오 승리", owned: "보유 브롤러", max: "11레벨 브롤러",
  power: "파워 강화 진행률", coins: "11레벨까지 필요 코인",
  gadget: "보유 가젯", star: "보유 스타파워", hyper: "보유 하이퍼차지",
  ranked: "현재 경쟁전", rankedHighest: "역대 최고 경쟁전",
  noRanked: "기록 없음", top: "트로피 상위 브롤러",
  caveat: "승수는 누적 기록이므로 많다고 실력이 더 뛰어나다는 뜻은 아니야. 파워 강화 진행률은 보유 브롤러 기준이고, 상대 전적·맞대결 승률을 의미하지 않아.",
  freshnessStale: "캐시된 프로필 (최신 정보가 아닐 수 있음)", tag: "태그", notAvailable: "—",
};
const ja: typeof en = {
  title: "プレイヤー比較", eyebrow: "プレイヤー VS プレイヤー",
  description: "2人のプレイヤータグを入力してトロフィー、勝利数、育成状況、ランクを比較しましょう。",
  first: "プレイヤーAのタグ", second: "プレイヤーBのタグ", action: "比較する", busy: "比較中…",
  invalid: "異なる有効なプレイヤータグを2つ入力してください。", failed: "プロフィールを取得できませんでした。",
  retry: "再試行", share: "比較リンクをコピー", copied: "コピーしました", copyFailed: "コピーできませんでした。",
  intro: "2つのタグを入力すると比較結果が表示されます。", stats: "プロフィール比較",
  trophy: "トロフィー", peak: "最高トロフィー", victory3: "3対3の勝利", solo: "ソロ勝利",
  duo: "デュオ勝利", owned: "所持キャラ", max: "パワー11のキャラ",
  power: "強化進捗", coins: "パワー11までのコイン",
  gadget: "ガジェット", star: "スターパワー", hyper: "ハイパーチャージ",
  ranked: "現在のランク", rankedHighest: "最高ランク", noRanked: "記録なし",
  top: "トロフィー上位キャラ",
  caveat: "勝利数は累積記録です。数値が高くても実力の証明ではありません。強化進捗は所持キャラのみを対象とし、直接対戦の勝率ではありません。",
  freshnessStale: "キャッシュされた情報（最新ではない可能性があります）", tag: "タグ", notAvailable: "—",
};

export function getComparisonMessages(locale: Locale) {
  // Base English fallback for languages not yet fully translated.
  return locale === "ko" ? ko : locale === "ja" ? ja : en;
}
