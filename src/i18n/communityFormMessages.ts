import type { Locale } from "./config";
const messages: Record<Locale, [string, string, string, string]> = {
  ko: ["제목은 4~100자로 입력해 주세요.", "경기 상황과 증거 설명을 20~4,000자로 입력해 주세요.", "댓글은 2~2,000자로 입력해 주세요.", "보이지 않는 특수 문자를 제거해 주세요."],
  en: ["Enter a title of 4–100 characters.", "Describe the match and evidence in 20–4,000 characters.", "Enter a comment of 2–2,000 characters.", "Remove invisible special characters."],
  ja: ["タイトルは4〜100文字で入力してください。", "試合の状況と証拠を20〜4,000文字で説明してください。", "コメントは2〜2,000文字で入力してください。", "不可視の特殊文字を削除してください。"],
  "pt-br": ["Use um título de 4–100 caracteres.", "Descreva a partida e as provas em 20–4.000 caracteres.", "Use um comentário de 2–2.000 caracteres.", "Remova caracteres especiais invisíveis."],
  es: ["Escribe un título de 4–100 caracteres.", "Describe la partida y las pruebas en 20–4.000 caracteres.", "Escribe un comentario de 2–2.000 caracteres.", "Elimina los caracteres especiales invisibles."],
  tr: ["4–100 karakterlik bir başlık yaz.", "Maçı ve kanıtı 20–4.000 karakterle açıkla.", "2–2.000 karakterlik bir yorum yaz.", "Görünmez özel karakterleri kaldır."],
  de: ["Titel mit 4–100 Zeichen eingeben.", "Spiel und Belege mit 20–4.000 Zeichen beschreiben.", "Kommentar mit 2–2.000 Zeichen eingeben.", "Unsichtbare Sonderzeichen entfernen."],
  fr: ["Saisis un titre de 4 à 100 caractères.", "Décris la partie et les preuves en 20 à 4 000 caractères.", "Saisis un commentaire de 2 à 2 000 caractères.", "Supprime les caractères spéciaux invisibles."],
  it: ["Inserisci un titolo di 4–100 caratteri.", "Descrivi la partita e le prove in 20–4.000 caratteri.", "Inserisci un commento di 2–2.000 caratteri.", "Rimuovi i caratteri speciali invisibili."],
  ru: ["Введите заголовок длиной 4–100 символов.", "Опишите матч и доказательства в 20–4 000 символах.", "Введите комментарий длиной 2–2 000 символов.", "Удалите невидимые специальные символы."],
};
export function getCommunityFormMessages(locale: Locale) {
  const [titleHint, bodyHint, commentHint, characters] = messages[locale];
  return { titleHint, bodyHint, commentHint, characters };
}
