import type { Locale } from "../config";
import type { MiniGameId } from "../../utils/minigames/registry";

const messages = {
  ko: { pending: "데이터 준비 중", higherTitle: "하이어 오어 로어", higherDescription: "브롤러의 능력치를 비교하는 게임입니다.", higherReason: "현재 게임에 사용할 최신 능력치 데이터를 검증하고 있습니다.", releaseTitle: "브롤러 출시 순서", releaseDescription: "브롤러가 출시된 순서를 맞히는 게임입니다.", releaseReason: "신뢰할 수 있는 출시 기록을 확인한 뒤 이 게임을 준비할 예정입니다." },
  en: { pending: "Data pending", higherTitle: "Higher or Lower", higherDescription: "Compare brawler stats in a quick challenge.", higherReason: "Current, verified gameplay stats are not available yet.", releaseTitle: "Brawler Release Order", releaseDescription: "Put brawlers in the order they were released.", releaseReason: "A reliable release history is not available yet." },
  ja: { pending: "データ準備中", higherTitle: "ハイアー・オア・ロー", higherDescription: "ブロウラーのステータスを比べるゲームです。", higherReason: "ゲームに使える最新のステータスデータを確認中です。", releaseTitle: "ブロウラーの登場順", releaseDescription: "ブロウラーの登場順を当てるゲームです。", releaseReason: "信頼できる登場履歴が確認できていません。" },
  "pt-br": { pending: "Dados pendentes", higherTitle: "Maior ou menor", higherDescription: "Compare os atributos dos brawlers.", higherReason: "Ainda não há dados atuais e verificados para o jogo.", releaseTitle: "Ordem de lançamento dos brawlers", releaseDescription: "Organize os brawlers pela ordem de lançamento.", releaseReason: "Ainda não há um histórico de lançamentos confiável." },
  es: { pending: "Datos pendientes", higherTitle: "Mayor o menor", higherDescription: "Compara las estadísticas de los brawlers.", higherReason: "Aún no hay estadísticas actuales y verificadas para el juego.", releaseTitle: "Orden de lanzamiento de los brawlers", releaseDescription: "Ordena los brawlers según cuándo se lanzaron.", releaseReason: "Aún no hay un historial de lanzamientos fiable." },
  tr: { pending: "Veri bekleniyor", higherTitle: "Yüksek mi Düşük mü?", higherDescription: "Savaşçıların istatistiklerini karşılaştır.", higherReason: "Oyun için güncel ve doğrulanmış istatistikler henüz yok.", releaseTitle: "Savaşçı Çıkış Sırası", releaseDescription: "Savaşçıları çıkış sırasına diz.", releaseReason: "Güvenilir bir çıkış geçmişi henüz bulunmuyor." },
  de: { pending: "Daten ausstehend", higherTitle: "Höher oder niedriger", higherDescription: "Vergleiche die Werte verschiedener Brawler.", higherReason: "Aktuelle, geprüfte Spieldaten sind noch nicht verfügbar.", releaseTitle: "Erscheinungsreihenfolge der Brawler", releaseDescription: "Bringe die Brawler in die Reihenfolge ihrer Veröffentlichung.", releaseReason: "Eine verlässliche Veröffentlichungshistorie liegt noch nicht vor." },
  fr: { pending: "Données en attente", higherTitle: "Plus ou moins", higherDescription: "Comparez les statistiques des brawlers.", higherReason: "Les statistiques actuelles et vérifiées ne sont pas encore disponibles.", releaseTitle: "Ordre de sortie des brawlers", releaseDescription: "Classez les brawlers selon leur date de sortie.", releaseReason: "Un historique fiable des sorties n’est pas encore disponible." },
  it: { pending: "Dati in attesa", higherTitle: "Più o meno", higherDescription: "Confronta le statistiche dei brawler.", higherReason: "I dati attuali e verificati per il gioco non sono ancora disponibili.", releaseTitle: "Ordine di uscita dei brawler", releaseDescription: "Ordina i brawler in base alla loro uscita.", releaseReason: "Non è ancora disponibile uno storico affidabile delle uscite." },
  ru: { pending: "Данные готовятся", higherTitle: "Больше или меньше", higherDescription: "Сравните характеристики бойцов.", higherReason: "Проверенные актуальные характеристики пока недоступны.", releaseTitle: "Порядок выхода бойцов", releaseDescription: "Расположите бойцов в порядке их выхода.", releaseReason: "Надёжной истории выхода бойцов пока нет." },
} as const satisfies Record<Locale, Record<string, string>>;

export type BlockedGameMessages = (typeof messages)["ko"];
export function getBlockedGameMessages(locale: Locale): BlockedGameMessages { return messages[locale] as BlockedGameMessages; }
export function getBlockedCopy(locale: Locale, id: Extract<MiniGameId, "higher-lower" | "release-order">) {
  const copy = getBlockedGameMessages(locale);
  return id === "higher-lower"
    ? { title: copy.higherTitle, description: copy.higherDescription, reason: copy.higherReason }
    : { title: copy.releaseTitle, description: copy.releaseDescription, reason: copy.releaseReason };
}
