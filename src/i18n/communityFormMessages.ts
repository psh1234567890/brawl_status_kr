import type { Locale } from "./config";
const messages: Record<Locale, [string, string, string, string]> = {
  ko: ["제목을 입력해 주세요.","경기 상황과 증거를 설명해 주세요.","댓글을 입력해 주세요.","보이지 않는 특수 문자를 제거해 주세요."],
  en: ["Enter a title.","Describe the match and evidence.","Enter a comment.","Remove invisible special characters."],
  ja: ["タイトルを入力してください。","試合の状況と証拠を説明してください。","コメントを入力してください。","不可視の特殊文字を削除してください。"],
  "pt-br": ["Escreva um título.","Descreva a partida e as provas.","Escreva um comentário.","Remova caracteres especiais invisíveis."],
  es: ["Escribe un título.","Describe la partida y las pruebas.","Escribe un comentario.","Elimina los caracteres especiales invisibles."],
  tr: ["Bir başlık yaz.","Maçı ve kanıtı açıkla.","Bir yorum yaz.","Görünmez özel karakterleri kaldır."],
  de: ["Titel eingeben.","Spiel und Belege beschreiben.","Kommentar eingeben.","Unsichtbare Sonderzeichen entfernen."],
  fr: ["Saisis un titre.","Décris la partie et les preuves.","Saisis un commentaire.","Supprime les caractères spéciaux invisibles."],
  it: ["Inserisci un titolo.","Descrivi la partita e le prove.","Inserisci un commento.","Rimuovi i caratteri speciali invisibili."],
  ru: ["Введите заголовок.","Опишите матч и доказательства.","Введите комментарий.","Удалите невидимые специальные символы."],
};
export function getCommunityFormMessages(locale: Locale) {
  const [titleHint, bodyHint, commentHint, characters] = messages[locale];
  return { titleHint, bodyHint, commentHint, characters };
}
