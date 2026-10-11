import type { Locale } from "./config";

type Copy = { title: string; label: string; description: string; active: string; inactive: string };
export const analyticsOptOutMessages: Record<Locale, Copy> = {
  ko: {
    title: "이 브라우저의 이용 통계 기록 설정",
    label: "방문·검색·미니게임 통계 및 검색 태그 기록 제외",
    description: "설정하면 이 브라우저에서 발생하는 이후의 방문, 플레이어 검색, 미니게임 활동과 검색 태그를 운영 통계에 기록하지 않습니다. 로그인이나 플레이어 검색 기능은 그대로 이용할 수 있습니다. 이미 집계된 과거 통계는 소급 삭제되지 않으며 각 보관기간에 따라 만료됩니다.",
    active: "이 브라우저의 새로운 통계 기록이 제외됩니다.",
    inactive: "이 브라우저의 활동이 운영 통계에 포함될 수 있습니다.",
  },
  en: {
    title: "Analytics settings for this browser",
    label: "Exclude visits, searches, minigames and searched player tags",
    description: "When enabled, future visits, player searches, minigame activity and searched tags from this browser will not count toward site analytics. Search and sign-in still work. Earlier statistics are not retrospectively removed and expire under the normal retention policy.",
    active: "New analytics activity is excluded for this browser.",
    inactive: "This browser's activity may count toward site analytics.",
  },
  ja: {
    title: "このブラウザーの統計設定",
    label: "訪問・検索・ミニゲーム・検索タグの記録を除外",
    description: "有効にすると、このブラウザーで今後発生する訪問、プレイヤー検索、ミニゲーム活動、検索タグは運営統計に記録されません。ログインや検索は引き続き利用できます。過去の集計は遡って削除されず、通常の保存期間に従って消去されます。",
    active: "このブラウザーの新しい活動は集計対象外です。",
    inactive: "このブラウザーの活動が集計される場合があります。",
  },
  "pt-br": {
    title: "Estatísticas deste navegador",
    label: "Excluir visitas, buscas, minijogos e tags pesquisadas",
    description: "Ao ativar, visitas, buscas, atividades dos minijogos e tags pesquisadas futuramente neste navegador não entram nas estatísticas. Busca e login continuam funcionando. Totais antigos seguem o prazo normal de retenção.",
    active: "Novas atividades deste navegador não serão contabilizadas.",
    inactive: "Atividades deste navegador poderão ser contabilizadas.",
  },
  es: {
    title: "Estadísticas de este navegador",
    label: "Excluir visitas, búsquedas, minijuegos y tags buscados",
    description: "Al activarlo, las futuras visitas, búsquedas, partidas y tags buscados desde este navegador no se incluirán en las estadísticas. La búsqueda y el inicio de sesión siguen funcionando. Los datos anteriores caducan según el plazo habitual.",
    active: "La actividad futura de este navegador queda excluida.",
    inactive: "La actividad de este navegador podría contabilizarse.",
  },
  tr: {
    title: "Bu tarayıcının istatistik ayarları",
    label: "Ziyaret, arama, mini oyun ve aranan etiketleri hariç tut",
    description: "Etkinleştirildiğinde bu tarayıcıdaki gelecekteki ziyaretler, oyuncu aramaları, mini oyunlar ve aranan etiketler istatistiklere katılmaz. Arama ve giriş çalışmaya devam eder. Önceki toplamlar normal saklama süresi sonunda silinir.",
    active: "Bu tarayıcının yeni etkinlikleri hariç tutuluyor.",
    inactive: "Bu tarayıcının etkinlikleri istatistiklere katılabilir.",
  },
  de: {
    title: "Statistikeinstellungen dieses Browsers",
    label: "Besuche, Suchen, Minispiele und gesuchte Tags ausschließen",
    description: "Wenn aktiviert, zählen zukünftige Besuche, Suchen, Minispiele und gesuchte Tags dieses Browsers nicht zur Statistik. Suche und Anmeldung funktionieren weiter. Frühere Zahlen verfallen gemäß der normalen Aufbewahrung.",
    active: "Neue Aktivitäten dieses Browsers werden ausgeschlossen.",
    inactive: "Aktivitäten dieses Browsers können erfasst werden.",
  },
  fr: {
    title: "Statistiques de ce navigateur",
    label: "Exclure visites, recherches, mini-jeux et tags recherchés",
    description: "En activant cette option, les visites, recherches, mini-jeux et tags recherchés à venir dans ce navigateur seront exclus des statistiques. Connexion et recherche restent accessibles. Les anciennes données expirent selon la durée habituelle.",
    active: "La nouvelle activité de ce navigateur est exclue.",
    inactive: "L'activité de ce navigateur peut être comptabilisée.",
  },
  it: {
    title: "Statistiche di questo browser",
    label: "Escludi visite, ricerche, minigiochi e tag cercati",
    description: "Se attivata, visite, ricerche, minigiochi e tag cercati in futuro su questo browser non saranno conteggiati. Ricerca e accesso restano disponibili. I dati precedenti scadono secondo il normale periodo di conservazione.",
    active: "La nuova attività di questo browser è esclusa.",
    inactive: "L'attività di questo browser potrebbe essere conteggiata.",
  },
  ru: {
    title: "Настройки статистики для этого браузера",
    label: "Исключить посещения, поиски, мини-игры и теги",
    description: "Если включено, будущие посещения, поиски игроков, мини-игры и искомые теги этого браузера не попадут в статистику. Поиск и вход останутся доступны. Прежние данные удаляются по обычным срокам хранения.",
    active: "Новая активность этого браузера исключена.",
    inactive: "Активность этого браузера может учитываться.",
  },
};
