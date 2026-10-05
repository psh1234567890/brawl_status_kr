import type { Locale } from "../config";

type BrawlerQuizGuideMessages = {
  searchLabel: string;
  title: string;
  rulesTitle: string;
  rules: string;
  scoringTitle: string;
  scoring: string;
  recordsTitle: string;
  records: string;
  catalogLink: string;
};

export const brawlerQuizGuideMessages: Record<Locale, BrawlerQuizGuideMessages> = {
  ko: {
    searchLabel: "브롤스타즈 브롤러 이름 퀴즈", title: "브롤러 이름 퀴즈 플레이 방법",
    rulesTitle: "어떻게 플레이하나요?",
    rules: "3분·5분·10분 또는 무제한 연습을 선택하고 게임 시작을 누르세요. 현재 언어의 브롤러 이름이나 영어 이름을 입력한 뒤 Enter 또는 입력 버튼으로 제출합니다. 순서에 관계없이 답할 수 있습니다.",
    scoringTitle: "점수와 결과는 어떻게 계산하나요?",
    scoring: "브롤러 한 명당 한 번만 점수를 받으며 같은 이름을 다시 입력해도 점수가 늘지 않습니다. 모든 이름을 맞히거나 시간이 끝나면 결과가 표시됩니다. 중간에 종료할 수도 있고, 결과에서 맞힌 브롤러·놓친 브롤러·모드별 최고 기록을 확인하고 결과를 공유할 수 있습니다.",
    recordsTitle: "로그인이 필요한가요?",
    records: "로그인 없이 무료로 플레이할 수 있으며, 브라우저 저장소가 허용되면 이 브라우저에 최고 기록을 저장합니다. 선택적으로 Google 로그인 후 개인 기록을 동기화하고 기존 브라우저 기록을 직접 가져올 수 있습니다. 이 기록은 비공개 개인 기록이며 경쟁 랭킹 점수가 아닙니다.",
    catalogLink: "브롤러 도감에서 이름과 종류 확인하기",
  },
  en: {
    searchLabel: "Brawl Stars Brawler Name Quiz", title: "How to play the brawler name quiz",
    rulesTitle: "How do I play?",
    rules: "Choose 3, 5 or 10 minutes, or unlimited practice, then start the game. Type a brawler’s name in the current language or English and press Enter or Submit. You can answer in any order.",
    scoringTitle: "How are scores and results calculated?",
    scoring: "Each brawler scores once; duplicate names add no points. Results appear when you name every brawler or time runs out. You can also finish early. Review found and missed brawlers, personal bests for each mode, and share your result.",
    recordsTitle: "Do I need to sign in?",
    records: "Play for free without signing in. Personal bests are saved in this browser when storage is available. Optional Google sign-in lets you sync personal records and explicitly import existing browser records. These are private personal records, not competitive ranking scores.",
    catalogLink: "Explore brawler names and types in the catalog",
  },
  ja: {
    searchLabel: "ブロスタ ブロウラー名前当てクイズ", title: "ブロウラー名前当てクイズの遊び方",
    rulesTitle: "どうやって遊びますか？",
    rules: "3分・5分・10分または時間無制限を選んでゲームを開始します。現在の言語か英語でブロウラー名を入力し、Enterまたは回答ボタンで送信します。回答の順序は自由です。",
    scoringTitle: "点数と結果はどう決まりますか？",
    scoring: "各ブロウラーは一度だけ得点になり、同じ名前を再入力しても加点されません。全員正解または時間切れで結果が表示され、途中終了もできます。正解・未回答のブロウラーやモード別の自己ベストを確認し、結果を共有できます。",
    recordsTitle: "ログインは必要ですか？",
    records: "ログインなしで無料で遊べます。保存が許可されていれば自己ベストをこのブラウザーに保存します。任意のGoogleログインで個人記録を同期し、既存のブラウザー記録を自分で取り込めます。記録は非公開で、競技ランキングのスコアではありません。",
    catalogLink: "図鑑でブロウラーの名前と種類を確認する",
  },
  "pt-br": {
    searchLabel: "Quiz de nomes de brawlers de Brawl Stars", title: "Como jogar o quiz de nomes dos brawlers",
    rulesTitle: "Como eu jogo?",
    rules: "Escolha 3, 5 ou 10 minutos, ou prática sem limite, e comece o jogo. Digite o nome de um brawler no idioma atual ou em inglês e pressione Enter ou Enviar. A ordem das respostas é livre.",
    scoringTitle: "Como funcionam a pontuação e os resultados?",
    scoring: "Cada brawler pontua uma vez; nomes repetidos não dão pontos extras. O resultado aparece ao acertar todos ou quando o tempo acaba. Você também pode terminar antes. Confira brawlers encontrados e não encontrados, recordes por modo e compartilhe o resultado.",
    recordsTitle: "Preciso entrar na conta?",
    records: "Jogue grátis sem entrar. Os recordes ficam neste navegador quando o armazenamento está disponível. O login opcional com Google permite sincronizar registros pessoais e importar os registros do navegador por sua escolha. São registros privados, não pontuações de ranking competitivo.",
    catalogLink: "Veja nomes e tipos de brawlers no catálogo",
  },
  es: {
    searchLabel: "Quiz de nombres de brawlers de Brawl Stars", title: "Cómo jugar al quiz de nombres de brawlers",
    rulesTitle: "¿Cómo se juega?",
    rules: "Elige 3, 5 o 10 minutos, o práctica sin límite, y empieza. Escribe el nombre de un brawler en el idioma actual o en inglés y pulsa Enter o Enviar. Puedes responder en cualquier orden.",
    scoringTitle: "¿Cómo se calculan los puntos y resultados?",
    scoring: "Cada brawler puntúa una vez; repetir un nombre no suma puntos. El resultado aparece al acertar todos o al agotarse el tiempo. También puedes terminar antes. Revisa los brawlers acertados y pendientes, los récords por modo y comparte el resultado.",
    recordsTitle: "¿Necesito iniciar sesión?",
    records: "Juega gratis sin iniciar sesión. Los récords se guardan en este navegador si el almacenamiento está disponible. El acceso opcional con Google permite sincronizar registros personales e importar los del navegador cuando lo elijas. Son registros privados, no puntuaciones de un ranking competitivo.",
    catalogLink: "Consulta nombres y tipos de brawlers en el catálogo",
  },
  tr: {
    searchLabel: "Brawl Stars Savaşçı İsim Testi", title: "Savaşçı isim testi nasıl oynanır?",
    rulesTitle: "Nasıl oynarım?",
    rules: "3, 5 veya 10 dakika ya da süresiz alıştırma seçip oyunu başlat. Savaşçının adını mevcut dilde veya İngilizce yaz ve Enter ya da Gönder ile cevapla. İstediğin sırayla cevap verebilirsin.",
    scoringTitle: "Puanlar ve sonuçlar nasıl hesaplanır?",
    scoring: "Her savaşçı yalnızca bir kez puan kazandırır; aynı adı tekrarlamak puanı artırmaz. Tüm isimleri bulunca veya süre bitince sonuç gösterilir. Erken de bitirebilirsin. Bulunan ve kaçırılan savaşçıları, modlara göre rekorları görüp sonucu paylaşabilirsin.",
    recordsTitle: "Giriş yapmam gerekiyor mu?",
    records: "Giriş yapmadan ücretsiz oynayabilirsin. Depolama kullanılabiliyorsa rekorlar bu tarayıcıda saklanır. İsteğe bağlı Google girişi kişisel kayıtlarını eşitlemeni ve eski tarayıcı kayıtlarını kendi seçiminle aktarmanı sağlar. Bunlar özel kişisel kayıtlardır, rekabetçi sıralama puanları değildir.",
    catalogLink: "Katalogda savaşçı adlarını ve türlerini incele",
  },
  de: {
    searchLabel: "Brawl Stars Brawler-Namenquiz", title: "So funktioniert das Brawler-Namenquiz",
    rulesTitle: "Wie spiele ich?",
    rules: "Wähle 3, 5 oder 10 Minuten oder Üben ohne Zeitlimit und starte das Spiel. Gib einen Brawler-Namen in der aktuellen Sprache oder auf Englisch ein und drücke Enter oder Eingeben. Die Reihenfolge ist frei.",
    scoringTitle: "Wie werden Punkte und Ergebnisse berechnet?",
    scoring: "Jeder Brawler zählt einmal; doppelte Namen geben keine weiteren Punkte. Das Ergebnis erscheint, wenn alle gefunden sind oder die Zeit abläuft. Du kannst auch früher aufhören. Sieh gefundene und verpasste Brawler sowie Bestleistungen je Modus und teile das Ergebnis.",
    recordsTitle: "Muss ich mich anmelden?",
    records: "Du kannst kostenlos ohne Anmeldung spielen. Bestleistungen werden bei verfügbarem Speicher in diesem Browser gespeichert. Mit optionaler Google-Anmeldung kannst du persönliche Rekorde synchronisieren und vorhandene Browser-Rekorde bewusst importieren. Sie sind privat und keine Wettbewerbsergebnisse.",
    catalogLink: "Brawler-Namen und Arten im Katalog ansehen",
  },
  fr: {
    searchLabel: "Quiz des noms de brawlers Brawl Stars", title: "Comment jouer au quiz des noms de brawlers",
    rulesTitle: "Comment jouer ?",
    rules: "Choisissez 3, 5 ou 10 minutes, ou un entraînement illimité, puis commencez. Saisissez un nom de brawler dans la langue actuelle ou en anglais et appuyez sur Entrée ou Valider. L’ordre des réponses est libre.",
    scoringTitle: "Comment les scores et résultats sont-ils calculés ?",
    scoring: "Chaque brawler rapporte un point une seule fois ; les doublons ne comptent pas. Le résultat apparaît quand tous les noms sont trouvés ou à la fin du temps. Vous pouvez aussi terminer plus tôt. Consultez les brawlers trouvés et manqués, vos records par mode et partagez le résultat.",
    recordsTitle: "Dois-je me connecter ?",
    records: "Jouez gratuitement sans connexion. Les records sont enregistrés dans ce navigateur si le stockage est disponible. La connexion Google facultative permet de synchroniser les records personnels et d’importer ceux du navigateur sur votre demande. Ces records sont privés et ne sont pas des scores de classement compétitif.",
    catalogLink: "Consulter les noms et types de brawlers dans le catalogue",
  },
  it: {
    searchLabel: "Quiz dei nomi dei brawler di Brawl Stars", title: "Come giocare al quiz dei nomi dei brawler",
    rulesTitle: "Come si gioca?",
    rules: "Scegli 3, 5 o 10 minuti oppure allenamento senza limiti e inizia. Scrivi il nome di un brawler nella lingua attuale o in inglese e premi Invio o Invia. Puoi rispondere in qualsiasi ordine.",
    scoringTitle: "Come vengono calcolati punti e risultati?",
    scoring: "Ogni brawler vale un punto una sola volta; i nomi ripetuti non aggiungono punti. Il risultato appare quando li trovi tutti o il tempo termina. Puoi anche finire prima. Controlla brawler trovati e mancanti, record per modalità e condividi il risultato.",
    recordsTitle: "Devo accedere?",
    records: "Puoi giocare gratis senza accedere. Se lo spazio di archiviazione è disponibile, i record vengono salvati in questo browser. L’accesso facoltativo con Google consente di sincronizzare i record personali e importare quelli del browser su tua scelta. Sono record privati, non punteggi di una classifica competitiva.",
    catalogLink: "Consulta nomi e tipi di brawler nel catalogo",
  },
  ru: {
    searchLabel: "Викторина по именам бойцов Brawl Stars", title: "Как играть в викторину по именам бойцов",
    rulesTitle: "Как играть?",
    rules: "Выберите 3, 5 или 10 минут либо режим без ограничения времени и начните игру. Введите имя бойца на текущем языке или по-английски и нажмите Enter или Ответить. Порядок ответов любой.",
    scoringTitle: "Как рассчитываются очки и результаты?",
    scoring: "Каждый боец приносит очки только один раз; повторные имена их не добавляют. Результат появится после всех правильных ответов или окончания времени. Можно завершить игру раньше. Посмотрите угаданных и неугаданных бойцов, рекорды по режимам и поделитесь результатом.",
    recordsTitle: "Нужно ли входить в аккаунт?",
    records: "Играйте бесплатно без входа. Рекорды сохраняются в этом браузере, если доступно хранилище. Необязательный вход через Google позволяет синхронизировать личные рекорды и по своему выбору импортировать записи браузера. Это частные записи, а не очки соревновательного рейтинга.",
    catalogLink: "Посмотреть имена и типы бойцов в каталоге",
  },
};
