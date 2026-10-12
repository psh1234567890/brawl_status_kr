import type { Locale } from "../config";

const messages = {
  ko: { hp: "기본 체력 (게임 데이터 기준)", earlier: "먼저 출시된 브롤러는?", higher: "기본 체력이 더 높은 브롤러는?",
    higherRules: "두 브롤러의 기본 체력을 비교하고 더 높은 쪽을 선택해. 장비·버프는 반영하지 않아.",
    releaseRules: "기록에 남은 최초 공개 출시일을 비교하고 먼저 출시된 쪽을 선택해. 동일 날짜는 출제하지 않아.",
    hpSource: "체력 출처: BrawlAPI의 게임 파일 미러 · 실제 전투 체력과 다를 수 있음",
    releaseSource: "출시일 출처: Liquipedia 커뮤니티 연혁(검증된 일부 브롤러) · 공식 출시일 목록은 아님",
    pool: "참가 브롤러 {count}명", shown: "정답 공개", localBest: "이 기기의 최고기록만 저장돼. 계정 동기화는 지원 예정." },
  en: { hp: "Base HP (game data)", earlier: "Which brawler was released first?", higher: "Which brawler has more base HP?",
    higherRules: "Pick the brawler with higher base HP. Gear and buffs are excluded.",
    releaseRules: "Choose the earlier documented public debut. Same-date pairs are excluded.",
    hpSource: "Source: game-file mirror by BrawlAPI. Actual battle HP may differ.",
    releaseSource: "Source: curated Liquipedia community history; not an official release calendar.",
    pool: "{count} eligible brawlers", shown: "Answer revealed", localBest: "Best stored on this device. Account sync is planned." },
  ja: { hp: "基本HP", earlier: "先に登場したのは？", higher: "基本HPが高いのは？", higherRules: "基本HPの高い方を選ぼう。装備やバフは除外。", releaseRules: "記録された初登場日が早い方を選ぼう。同日は対象外。", hpSource: "出典：BrawlAPIのゲームデータ。実際のHPとは異なる場合があります。", releaseSource: "出典：Liquipediaの一部記録。公式の発売日一覧ではありません。", pool: "対象キャラ {count} 人", shown: "正解", localBest: "記録はこの端末にのみ保存されます。" },
  "pt-br": { hp: "HP base", earlier: "Quem foi lançado primeiro?", higher: "Quem tem mais HP base?", higherRules: "Compare o HP base sem equipamentos nem bônus.", releaseRules: "Escolha a estreia pública mais antiga. Datas iguais são excluídas.", hpSource: "Fonte: dados do jogo via BrawlAPI.", releaseSource: "Fonte: cronologia comunitária do Liquipedia, não oficial.", pool: "{count} brawlers elegíveis", shown: "Resposta", localBest: "Recorde salvo apenas neste dispositivo." },
  es: { hp: "Salud base", earlier: "¿Quién se lanzó primero?", higher: "¿Quién tiene más salud base?", higherRules: "Compara la salud base sin equipo ni mejoras.", releaseRules: "Elige el debut público más antiguo. Se excluyen empates.", hpSource: "Fuente: datos del juego mediante BrawlAPI.", releaseSource: "Fuente: cronología comunitaria de Liquipedia, no oficial.", pool: "{count} brawlers disponibles", shown: "Respuesta", localBest: "Récord guardado solo en este dispositivo." },
  tr: { hp: "Temel can", earlier: "Hangisi daha önce çıktı?", higher: "Hangisinin temel canı daha fazla?", higherRules: "Ekipman ve güçlendirmeler olmadan temel canı karşılaştır.", releaseRules: "Daha önce çıkan karakteri seç. Aynı tarihli eşleşmeler hariç.", hpSource: "Kaynak: BrawlAPI oyun verileri.", releaseSource: "Kaynak: Liquipedia topluluk geçmişi, resmî değil.", pool: "{count} karakter", shown: "Doğru cevap", localBest: "Rekor yalnızca bu cihazda saklanır." },
  de: { hp: "Basis-HP", earlier: "Wer erschien zuerst?", higher: "Wer hat mehr Basis-HP?", higherRules: "Vergleiche die Basis-HP ohne Ausrüstung oder Boni.", releaseRules: "Wähle das frühere öffentliche Debüt. Gleiche Daten sind ausgeschlossen.", hpSource: "Quelle: Spieldaten über BrawlAPI.", releaseSource: "Quelle: Liquipedia-Community-Chronik, nicht offiziell.", pool: "{count} Brawler", shown: "Auflösung", localBest: "Rekord wird nur auf diesem Gerät gespeichert." },
  fr: { hp: "PV de base", earlier: "Qui est sorti en premier ?", higher: "Qui a le plus de PV de base ?", higherRules: "Comparez les PV sans équipement ni bonus.", releaseRules: "Choisissez la première sortie publique. Les dates identiques sont exclues.", hpSource: "Source : fichiers du jeu via BrawlAPI.", releaseSource: "Source : chronologie communautaire Liquipedia, non officielle.", pool: "{count} brawlers", shown: "Réponse", localBest: "Record enregistré uniquement sur cet appareil." },
  it: { hp: "PS base", earlier: "Chi è uscito prima?", higher: "Chi ha più PS base?", higherRules: "Confronta i PS di base senza bonus.", releaseRules: "Scegli il debutto pubblico precedente. Le date uguali sono escluse.", hpSource: "Fonte: dati del gioco tramite BrawlAPI.", releaseSource: "Fonte: cronologia della community Liquipedia, non ufficiale.", pool: "{count} brawler", shown: "Risposta", localBest: "Record salvato solo su questo dispositivo." },
  ru: { hp: "Базовое здоровье", earlier: "Кто вышел раньше?", higher: "У кого больше базовое здоровье?", higherRules: "Сравнивайте базовое здоровье без усилений.", releaseRules: "Выберите более ранний публичный релиз. Одинаковые даты исключены.", hpSource: "Источник: данные игры через BrawlAPI.", releaseSource: "Источник: хронология сообщества Liquipedia, неофициальная.", pool: "Бойцов: {count}", shown: "Ответ", localBest: "Рекорд сохраняется только на этом устройстве." },
} satisfies Record<Locale, Record<string, string>>;

export function getComparisonMessages(locale: Locale) {
  return messages[locale];
}
