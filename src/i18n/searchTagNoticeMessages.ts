import type { Locale } from "./config";

type Notice = { title: string; notice: string };
export const searchTagNoticeMessages: Record<Locale, Notice> = {
  ko: { title: "검색 태그 운영 통계 안내", notice: "검색에 성공한 공개 플레이어 태그·검색 시각·횟수를 운영 통계 목적으로 7일간 기록합니다. 검색자의 IP나 사이트 계정과 연결해 저장하지 않으며, 운영자만 볼 수 있습니다. 기록 제외 및 삭제 요청은 개인정보처리방침을 참고해 주세요." },
  en: { title: "Player search statistics", notice: "For site operations we aggregate successfully searched public player tags, search times and counts for 7 days. We do not link them to a visitor's IP or site account. Only the owner can view them. See our privacy policy for opt-out and deletion requests." },
  ja: { title: "検索タグの運営統計", notice: "検索に成功した公開プレイヤータグ・検索時刻・回数を運営統計として7日間記録します。訪問者のIPやサイトアカウントとは紐付けて保存せず、運営者のみ閲覧できます。除外・削除申請はプライバシーポリシーをご覧ください。" },
  "pt-br": { title: "Estatísticas das buscas", notice: "Armazenamos por 7 dias as tags públicas buscadas com sucesso, horários e contagens para operar o site. Não associamos esses dados ao IP ou conta do visitante; apenas o operador pode vê-los. Consulte a política de privacidade para solicitar exclusão." },
  es: { title: "Estadísticas de búsquedas", notice: "Durante 7 días registramos etiquetas públicas buscadas con éxito, horas y recuentos para gestionar el sitio. No se vinculan con IP ni cuentas de visitantes; solo el administrador puede verlos. Consulta la política de privacidad para pedir exclusión." },
  tr: { title: "Arama etiketi istatistikleri", notice: "Başarılı aramalardaki herkese açık oyuncu etiketleri, saatleri ve sayıları site işletimi için 7 gün tutulur. Ziyaretçilerin IP veya hesaplarıyla eşleştirilmez; yalnızca yönetici görür. Kayıt dışı kalma ve silme talepleri için gizlilik politikasına bakın." },
  de: { title: "Spielersuchstatistik", notice: "Erfolgreich gesuchte öffentliche Spieler-Tags sowie Suchzeit und Anzahl werden für den Betrieb 7 Tage gespeichert. Wir verknüpfen sie nicht mit Besucher-IP oder Konto; nur der Betreiber kann sie sehen. Hinweise zur Löschung stehen in der Datenschutzerklärung." },
  fr: { title: "Statistiques des recherches", notice: "Pendant 7 jours nous agrégeons les tags publics recherchés avec succès, heures et nombres à des fins d'exploitation. Aucune association avec l'IP ou le compte du visiteur; seul le gestionnaire y accède. Consultez la politique de confidentialité pour les demandes de suppression." },
  it: { title: "Statistiche di ricerca", notice: "Per 7 giorni raccogliamo tag pubblici cercati con successo, orari e conteggi per gestire il sito. Non li associamo all'IP o all'account del visitatore; solo il gestore può consultarli. Le richieste di cancellazione sono descritte nella privacy policy." },
  ru: { title: "Статистика поиска игроков", notice: "В течение 7 дней для работы сайта хранятся открытые теги успешных поисков, время и количество. Данные не связываются с IP или аккаунтом посетителя; доступны только владельцу. Подробнее об исключении и удалении — в политике конфиденциальности." },
};
