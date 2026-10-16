import type { Locale } from "../../i18n/config";
import styles from "./brand.module.css";

// Disable after live player lookups have been verified to recover.
const API_OUTAGE_NOTICE_ACTIVE = true;

const messages: Record<Locale, { title: string; body: string; available: string }> = {
  ko: {
    title: "전적 조회 장애 안내",
    body: "외부 브롤스타즈 API 오류로 전적 검색·갱신이 불안정합니다. 잠시 후 다시 시도해 주세요.",
    available: "미니게임·도감·커뮤니티는 이용할 수 있습니다.",
  },
  en: {
    title: "Player lookup disruption",
    body: "Errors from the external Brawl Stars API are affecting player searches and updates. Please try again later.",
    available: "Mini games, the catalog and the community remain available.",
  },
  ja: {
    title: "戦績検索の障害について",
    body: "外部のブロスタAPIのエラーにより、戦績の検索・更新が不安定です。しばらくしてから再度お試しください。",
    available: "ミニゲーム・図鑑・コミュニティは引き続き利用できます。",
  },
  "pt-br": {
    title: "Instabilidade na busca de jogadores",
    body: "Erros na API externa do Brawl Stars afetam as buscas e atualizações de jogadores. Tente novamente mais tarde.",
    available: "Minijogos, catálogo e comunidade continuam disponíveis.",
  },
  es: {
    title: "Problemas en la búsqueda de jugadores",
    body: "Los errores de la API externa de Brawl Stars afectan las búsquedas y actualizaciones. Inténtalo de nuevo más tarde.",
    available: "Los minijuegos, el catálogo y la comunidad siguen disponibles.",
  },
  tr: {
    title: "Oyuncu aramasında kesinti",
    body: "Harici Brawl Stars API hataları oyuncu aramalarını ve güncellemelerini etkiliyor. Lütfen daha sonra tekrar deneyin.",
    available: "Mini oyunlar, katalog ve topluluk kullanılabilir durumda.",
  },
  de: {
    title: "Störung bei der Spielersuche",
    body: "Fehler der externen Brawl Stars API beeinträchtigen die Spielersuche und Aktualisierungen. Bitte versuche es später erneut.",
    available: "Minispiele, Katalog und Community sind weiterhin verfügbar.",
  },
  fr: {
    title: "Perturbation de la recherche de joueurs",
    body: "Des erreurs de l’API externe de Brawl Stars perturbent les recherches et les mises à jour. Réessayez plus tard.",
    available: "Les mini-jeux, le catalogue et la communauté restent disponibles.",
  },
  it: {
    title: "Problemi con la ricerca giocatori",
    body: "Gli errori dell’API esterna di Brawl Stars influiscono sulle ricerche e sugli aggiornamenti. Riprova più tardi.",
    available: "Minigiochi, catalogo e community restano disponibili.",
  },
  ru: {
    title: "Сбой поиска игроков",
    body: "Ошибки внешнего API Brawl Stars мешают поиску и обновлению данных игроков. Повторите попытку позже.",
    available: "Мини-игры, каталог и сообщество по-прежнему доступны.",
  },
};

export default function ServiceNotice({ locale }: { locale: Locale }) {
  if (!API_OUTAGE_NOTICE_ACTIVE) return null;
  const copy = messages[locale];
  return (
    <aside aria-label={copy.title} className={styles.serviceNotice}>
      <div className={styles.serviceNoticeInner}>
        <strong className={styles.serviceNoticeTitle}>{copy.title}</strong>
        <div>
          <p>{copy.body}</p>
          <p>{copy.available}</p>
        </div>
      </div>
    </aside>
  );
}
