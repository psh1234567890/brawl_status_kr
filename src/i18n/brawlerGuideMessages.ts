import type { Locale } from "./config";
type Guide = { title: string; questions: [string, string][]; search: string; meta: string };
export const brawlerGuideMessages: Record<Locale, Guide> = {
  ko: { title: "브롤러 도감 활용하기", search: "내 보유 브롤러 확인", meta: "맵별 추천 확인", questions: [
    ["전체 브롤러 수와 내 보유 수는 어떻게 다른가요?", "이 도감은 공개 카탈로그이며 내 계정의 보유 목록이 아닙니다. 전체 등록 수와 출시된 브롤러 수를 구분해 표시하고, 목록에는 출시된 브롤러만 표시합니다."],
    ["내가 보유한 브롤러는 어떻게 확인하나요?", "전적 검색에서 플레이어 태그를 입력하면 해당 플레이어의 보유 브롤러와 레벨을 확인할 수 있습니다. 조회한 플레이어를 저장하면 다음 방문에 다시 조회할 수 있습니다."],
    ["어떤 브롤러를 골라야 하나요?", "맵 메타에서 모드와 맵별 표본 통계를 확인하세요. 승률은 수집된 전투 표본의 결과이며 모든 플레이어의 승률이나 승리를 보장하지 않습니다."],
  ] },
  en: { title: "Using the Brawler catalog", search: "Check your owned Brawlers", meta: "Explore map recommendations", questions: [
    ["Is this my collection?", "This is a public catalog, not your account inventory. Registered and released totals are shown separately; the list includes released Brawlers only."],
    ["How do I check owned Brawlers?", "Search a player tag to see that player's Brawlers and levels. Save the player to look them up again on your next visit."],
    ["Which Brawler should I choose?", "Explore mode and map statistics in Map Meta. Win rates describe collected battle samples, not every player, and cannot guarantee a win."],
  ] },
  ja: { title: "ブロウラー図鑑の使い方", search: "所持ブロウラーを確認", meta: "マップ別のおすすめ", questions: [
    ["自分の所持一覧ですか？", "これは公開図鑑です。登録数とリリース済みの数を分け、一覧にはリリース済みのブロウラーだけを表示します。"],
    ["所持ブロウラーを確認するには？", "プレイヤータグを検索すると所持ブロウラーとレベルを確認できます。保存すると次の訪問で再検索できます。"],
    ["どのブロウラーを選べばよいですか？", "マップメタでモード・マップ別の標本統計を確認できます。勝率は収集した対戦標本の結果で、全プレイヤーの勝率や勝利を保証しません。"],
  ] },
  "pt-br": { title: "Como usar o catálogo", search: "Ver Brawlers obtidos", meta: "Recomendações por mapa", questions: [
    ["Esta é minha coleção?", "É um catálogo público. Os totais registrados e lançados são separados; a lista mostra apenas Brawlers lançados."],
    ["Como vejo meus Brawlers?", "Busque a tag do jogador para ver seus Brawlers e níveis. Salve o jogador para consultá-lo na próxima visita."],
    ["Qual Brawler devo escolher?", "Consulte as amostras por modo e mapa em Meta. As taxas de vitória descrevem batalhas coletadas, não todos os jogadores, e não garantem vitórias."],
  ] },
  es: { title: "Cómo usar el catálogo", search: "Ver Brawlers obtenidos", meta: "Recomendaciones por mapa", questions: [
    ["¿Es mi colección?", "Es un catálogo público. Los totales registrados y publicados se muestran por separado; la lista incluye solo Brawlers publicados."],
    ["¿Cómo veo mis Brawlers?", "Busca la etiqueta del jugador para ver sus Brawlers y niveles. Guarda al jugador para consultarlo en tu próxima visita."],
    ["¿Qué Brawler elijo?", "Consulta las muestras por modo y mapa en Meta. Las tasas reflejan batallas recopiladas, no a todos los jugadores, y no garantizan victorias."],
  ] },
  tr: { title: "Kataloğu kullanma", search: "Sahip olunan savaşçıları gör", meta: "Harita önerilerini incele", questions: [
    ["Bu benim koleksiyonum mu?", "Bu açık bir katalogdur. Kayıtlı ve yayımlanmış toplamlar ayrıdır; listede yalnızca yayımlanmış savaşçılar bulunur."],
    ["Savaşçılarımı nasıl görürüm?", "Oyuncu etiketini aratarak savaşçılarını ve seviyelerini görebilirsin. Sonraki ziyaret için oyuncuyu kaydet."],
    ["Hangi savaşçıyı seçmeliyim?", "Meta sayfasında mod ve harita örneklerini incele. Kazanma oranları toplanan maçları yansıtır; tüm oyuncuları temsil etmez veya zafer garantilemez."],
  ] },
  de: { title: "Den Brawler-Katalog nutzen", search: "Eigene Brawler ansehen", meta: "Kartenempfehlungen ansehen", questions: [
    ["Ist das meine Sammlung?", "Dies ist ein öffentlicher Katalog. Registrierte und veröffentlichte Brawler werden getrennt gezählt; die Liste zeigt nur veröffentlichte Brawler."],
    ["Wie sehe ich meine Brawler?", "Suche einen Spieler-Tag, um Brawler und Level zu sehen. Speichere den Spieler für die nächste Abfrage."],
    ["Welchen Brawler soll ich wählen?", "Sieh dir Modus- und Kartenstatistiken in Meta an. Siegraten basieren auf gesammelten Kämpfen, nicht auf allen Spielern, und garantieren keinen Sieg."],
  ] },
  fr: { title: "Utiliser le catalogue", search: "Voir les Brawlers obtenus", meta: "Recommandations par carte", questions: [
    ["Est-ce ma collection ?", "C'est un catalogue public. Les totaux enregistrés et sortis sont distincts; la liste contient uniquement les Brawlers sortis."],
    ["Comment voir mes Brawlers ?", "Recherchez le tag du joueur pour voir ses Brawlers et niveaux. Enregistrez-le pour le retrouver lors de votre prochaine visite."],
    ["Quel Brawler choisir ?", "Consultez les échantillons par mode et carte dans Méta. Les taux reflètent les combats collectés, pas tous les joueurs, et ne garantissent pas une victoire."],
  ] },
  it: { title: "Usare il catalogo", search: "Vedi Brawler posseduti", meta: "Consigli per mappa", questions: [
    ["È la mia collezione?", "È un catalogo pubblico. I totali registrati e pubblicati sono distinti; l'elenco mostra solo Brawler pubblicati."],
    ["Come vedo i miei Brawler?", "Cerca il tag del giocatore per vedere Brawler e livelli. Salva il giocatore per ritrovarlo alla prossima visita."],
    ["Quale Brawler scelgo?", "Consulta i campioni per modalità e mappa in Meta. I tassi descrivono battaglie raccolte, non tutti i giocatori, e non garantiscono vittorie."],
  ] },
  ru: { title: "Как пользоваться каталогом", search: "Посмотреть своих бойцов", meta: "Рекомендации по картам", questions: [
    ["Это моя коллекция?", "Это публичный каталог. Зарегистрированные и выпущенные бойцы считаются отдельно; список содержит только выпущенных бойцов."],
    ["Как посмотреть своих бойцов?", "Найдите тег игрока, чтобы увидеть бойцов и уровни. Сохраните игрока для поиска при следующем посещении."],
    ["Какого бойца выбрать?", "Посмотрите выборки по режимам и картам в Мете. Проценты побед описывают собранные бои, а не всех игроков, и не гарантируют победу."],
  ] },
};
