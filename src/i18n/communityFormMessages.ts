import type { Locale } from "./config";
const messages: Record<Locale, [string, string, string, string]> = {
  ko: ["제목을 입력해 주세요.","내용을 입력해 주세요.","댓글을 입력해 주세요.","보이지 않는 특수 문자를 제거해 주세요."],
  en: ["Enter a title.","Write your post.","Enter a comment.","Remove invisible special characters."],
  ja: ["タイトルを入力してください。","本文を入力してください。","コメントを入力してください。","不可視の特殊文字を削除してください。"],
  "pt-br": ["Escreva um título.","Escreva o conteúdo.","Escreva um comentário.","Remova caracteres especiais invisíveis."],
  es: ["Escribe un título.","Escribe el contenido.","Escribe un comentario.","Elimina los caracteres especiales invisibles."],
  tr: ["Bir başlık yaz.","İçeriği yaz.","Bir yorum yaz.","Görünmez özel karakterleri kaldır."],
  de: ["Titel eingeben.","Schreibe deinen Beitrag.","Kommentar eingeben.","Unsichtbare Sonderzeichen entfernen."],
  fr: ["Saisis un titre.","Écris ton message.","Saisis un commentaire.","Supprime les caractères spéciaux invisibles."],
  it: ["Inserisci un titolo.","Scrivi il contenuto.","Inserisci un commento.","Rimuovi i caratteri speciali invisibili."],
  ru: ["Введите заголовок.","Напишите текст.","Введите комментарий.","Удалите невидимые специальные символы."],
};
export function getCommunityFormMessages(locale: Locale) {
  const [titleHint, bodyHint, commentHint, characters] = messages[locale];
  return { titleHint, bodyHint, commentHint, characters };
}
