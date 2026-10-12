import type { Locale } from "./config";

/** Primary profile actions; keep labels short on 320px-wide screens. */
export const profileHubMessages: Record<Locale, {
  compare: string;
  save: string;
  saved: string;
  share: string;
  copied: string;
  failed: string;
  actionLabel: string;
}> = {
  ko: { compare: "친구와 비교", save: "저장", saved: "저장됨", share: "공유", copied: "링크 복사됨", failed: "공유 실패", actionLabel: "프로필 바로가기" },
  en: { compare: "Compare", save: "Save", saved: "Saved", share: "Share", copied: "Link copied", failed: "Share failed", actionLabel: "Profile actions" },
  ja: { compare: "友達と比較", save: "保存", saved: "保存済み", share: "共有", copied: "リンクをコピー", failed: "共有失敗", actionLabel: "プロフィール操作" },
  "pt-br": { compare: "Comparar", save: "Salvar", saved: "Salvo", share: "Compartilhar", copied: "Link copiado", failed: "Falha ao compartilhar", actionLabel: "Ações do perfil" },
  es: { compare: "Comparar", save: "Guardar", saved: "Guardado", share: "Compartir", copied: "Enlace copiado", failed: "Error al compartir", actionLabel: "Acciones del perfil" },
  tr: { compare: "Karşılaştır", save: "Kaydet", saved: "Kaydedildi", share: "Paylaş", copied: "Bağlantı kopyalandı", failed: "Paylaşım başarısız", actionLabel: "Profil işlemleri" },
  de: { compare: "Vergleichen", save: "Speichern", saved: "Gespeichert", share: "Teilen", copied: "Link kopiert", failed: "Teilen fehlgeschlagen", actionLabel: "Profilaktionen" },
  fr: { compare: "Comparer", save: "Enregistrer", saved: "Enregistré", share: "Partager", copied: "Lien copié", failed: "Échec du partage", actionLabel: "Actions du profil" },
  it: { compare: "Confronta", save: "Salva", saved: "Salvato", share: "Condividi", copied: "Link copiato", failed: "Condivisione fallita", actionLabel: "Azioni del profilo" },
  ru: { compare: "Сравнить", save: "Сохранить", saved: "Сохранено", share: "Поделиться", copied: "Ссылка скопирована", failed: "Ошибка отправки", actionLabel: "Действия с профилем" },
};
