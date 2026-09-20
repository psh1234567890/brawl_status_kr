import { numberLocales, type Locale } from "./config";

type UnitKind = "battle" | "win" | "loss" | "draw" | "day" | "sample";

const unitForms: Record<Locale, Record<UnitKind, Record<string, string>>> = {
  ko: {
    battle: { other: "전" }, win: { other: "승" }, loss: { other: "패" }, draw: { other: "무" },
    day: { other: "일" }, sample: { other: "건" },
  },
  en: {
    battle: { one: "battle", other: "battles" }, win: { one: "win", other: "wins" },
    loss: { one: "loss", other: "losses" }, draw: { one: "draw", other: "draws" },
    day: { one: "day", other: "days" }, sample: { one: "sample", other: "samples" },
  },
  ja: {
    battle: { other: "戦" }, win: { other: "勝" }, loss: { other: "敗" }, draw: { other: "分" },
    day: { other: "日" }, sample: { other: "件" },
  },
  "pt-br": {
    battle: { one: "batalha", other: "batalhas" }, win: { one: "vitória", other: "vitórias" },
    loss: { one: "derrota", other: "derrotas" }, draw: { one: "empate", other: "empates" },
    day: { one: "dia", other: "dias" }, sample: { one: "amostra", other: "amostras" },
  },
  es: {
    battle: { one: "batalla", other: "batallas" }, win: { one: "victoria", other: "victorias" },
    loss: { one: "derrota", other: "derrotas" }, draw: { one: "empate", other: "empates" },
    day: { one: "día", other: "días" }, sample: { one: "muestra", other: "muestras" },
  },
  tr: {
    battle: { other: "savaş" }, win: { other: "galibiyet" }, loss: { other: "mağlubiyet" },
    draw: { other: "beraberlik" }, day: { other: "gün" }, sample: { other: "örnek" },
  },
  de: {
    battle: { one: "Kampf", other: "Kämpfe" }, win: { one: "Sieg", other: "Siege" },
    loss: { one: "Niederlage", other: "Niederlagen" }, draw: { one: "Unentschieden", other: "Unentschieden" },
    day: { one: "Tag", other: "Tage" }, sample: { one: "Stichprobe", other: "Stichproben" },
  },
  fr: {
    battle: { one: "combat", other: "combats" }, win: { one: "victoire", other: "victoires" },
    loss: { one: "défaite", other: "défaites" }, draw: { one: "nul", other: "nuls" },
    day: { one: "jour", other: "jours" }, sample: { one: "échantillon", other: "échantillons" },
  },
  it: {
    battle: { one: "battaglia", other: "battaglie" }, win: { one: "vittoria", other: "vittorie" },
    loss: { one: "sconfitta", other: "sconfitte" }, draw: { one: "pareggio", other: "pareggi" },
    day: { one: "giorno", other: "giorni" }, sample: { one: "campione", other: "campioni" },
  },
  ru: {
    battle: { one: "бой", few: "боя", many: "боёв", other: "боя" },
    win: { one: "победа", few: "победы", many: "побед", other: "победы" },
    loss: { one: "поражение", few: "поражения", many: "поражений", other: "поражения" },
    draw: { one: "ничья", few: "ничьи", many: "ничьих", other: "ничьи" },
    day: { one: "день", few: "дня", many: "дней", other: "дня" },
    sample: { one: "выборка", few: "выборки", many: "выборок", other: "выборки" },
  },
};

function formatNumber(locale: Locale, value: number) {
  return value.toLocaleString(numberLocales[locale]);
}

function pluralUnit(locale: Locale, value: number, kind: UnitKind) {
  const forms = unitForms[locale][kind];
  if (locale === "ko" || locale === "ja" || locale === "tr") return forms.other;
  const category = new Intl.PluralRules(numberLocales[locale]).select(value);
  return forms[category] ?? forms.other;
}

export function formatUnit(locale: Locale, value: number, kind: UnitKind) {
  const number = formatNumber(locale, value);
  const unit = pluralUnit(locale, value, kind);
  if (locale === "ko" || locale === "ja") return `${number}${unit}`;
  return `${number} ${unit}`;
}

export function formatItems(locale: Locale, value: number) {
  const formatted = formatNumber(locale, value);
  if (locale === "ko") return `${formatted}개`;
  if (locale === "ja") return `${formatted}件`;
  return formatted;
}

export const formatBattles = (locale: Locale, value: number) => formatUnit(locale, value, "battle");
export const formatWins = (locale: Locale, value: number) => formatUnit(locale, value, "win");
export const formatDays = (locale: Locale, value: number) => formatUnit(locale, value, "day");
export const formatSamples = (locale: Locale, value: number) => formatUnit(locale, value, "sample");

export function formatWinLossDraw(locale: Locale, wins: number, losses: number, draws: number) {
  return [
    formatUnit(locale, wins, "win"),
    formatUnit(locale, losses, "loss"),
    formatUnit(locale, draws, "draw"),
  ].join(locale === "ko" || locale === "ja" ? " " : " · ");
}

export function formatLossDraw(locale: Locale, losses: number, draws: number) {
  return [formatUnit(locale, losses, "loss"), formatUnit(locale, draws, "draw")].join(
    locale === "ko" || locale === "ja" ? " " : " · ",
  );
}

export function formatBattleRecord(locale: Locale, total: number, wins: number, losses: number) {
  return [
    formatBattles(locale, total),
    formatWins(locale, wins),
    formatUnit(locale, losses, "loss"),
  ].join(locale === "ko" || locale === "ja" ? " " : " · ");
}

export function formatDuration(locale: Locale, hours: number, minutes: number) {
  const labels: Record<Locale, [string, string]> = {
    ko: ["시간", "분"], en: ["h", "m"], ja: ["時間", "分"],
    "pt-br": ["h", "min"], es: ["h", "min"], tr: ["sa", "dk"],
    de: ["Std.", "Min."], fr: ["h", "min"], it: ["h", "min"], ru: ["ч", "мин"],
  };
  const [hourLabel, minuteLabel] = labels[locale];
  if (locale === "ko" || locale === "ja") return `${hours}${hourLabel} ${minutes}${minuteLabel}`;
  return `${hours} ${hourLabel} ${minutes} ${minuteLabel}`;
}

export function formatSecondsDuration(locale: Locale, seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (locale === "ko") return `${minutes}분 ${remaining}초`;
  if (locale === "ja") return `${minutes}分 ${remaining}秒`;
  const labels: Record<Exclude<Locale, "ko" | "ja">, [string, string]> = {
    en: ["m", "s"], "pt-br": ["min", "s"], es: ["min", "s"], tr: ["dk", "sn"],
    de: ["Min.", "Sek."], fr: ["min", "s"], it: ["min", "s"], ru: ["мин", "с"],
  };
  const [minuteLabel, secondLabel] = labels[locale as Exclude<Locale, "ko" | "ja">];
  return `${minutes} ${minuteLabel} ${remaining} ${secondLabel}`;
}

export function formatCounterWinRate(locale: Locale, winRate: number) {
  const templates: Record<Locale, string> = {
    ko: `선택 브롤러를 상대로 ${winRate}% 승률`,
    en: `${winRate}% win rate against the selected brawler`,
    ja: `選択したブロウラーに対して勝率 ${winRate}%`,
    "pt-br": `${winRate}% de taxa de vitória contra o brawler selecionado`,
    es: `${winRate}% de tasa de victoria contra el brawler seleccionado`,
    tr: `Seçilen savaşçıya karşı %${winRate} kazanma oranı`,
    de: `${winRate}% Siegesrate gegen den ausgewählten Brawler`,
    fr: `${winRate} % de taux de victoire contre le brawler sélectionné`,
    it: `${winRate}% di percentuale di vittorie contro il brawler selezionato`,
    ru: `${winRate}% побед против выбранного бойца`,
  };
  return templates[locale];
}

export function formatBrawlerListDescription(locale: Locale, count: number) {
  const templates: Record<Locale, string> = {
    ko: `${count}개 보유. 카드를 누르면 스킨, 가젯, 스타파워, 기어를 확인할 수 있습니다.`,
    en: `${count} owned. Select a card to view skins, gadgets, Star Powers, and gears.`,
    ja: `${count}体所持。カードを選ぶとスキン、ガジェット、スターパワー、ギアを確認できます。`,
    "pt-br": `${count} obtidos. Selecione um card para ver skins, gadgets, Poderes de Estrela e engrenagens.`,
    es: `${count} obtenidos. Selecciona una tarjeta para ver skins, gadgets, Habilidades Estelares y refuerzos.`,
    tr: `${count} savaşçıya sahipsin. Kostümler, aksesuarlar, Yıldız Güçleri ve ekipmanlar için bir kart seç.`,
    de: `${count} im Besitz. Wähle eine Karte, um Skins, Gadgets, Star Powers und Ausrüstung zu sehen.`,
    fr: `${count} possédés. Sélectionnez une carte pour voir les skins, gadgets, pouvoirs star et équipements.`,
    it: `${count} posseduti. Seleziona una carta per vedere skin, gadget, abilità stellari ed equipaggiamenti.`,
    ru: `Получено бойцов: ${count}. Выберите карточку, чтобы посмотреть скины, гаджеты, звёздные силы и снаряжение.`,
  };
  return templates[locale];
}

export function formatBrawlerDetailsAria(locale: Locale, name: string) {
  const templates: Record<Locale, string> = {
    ko: `${name} 상세 보기`, en: `View ${name} details`, ja: `${name}の詳細を見る`,
    "pt-br": `Ver detalhes de ${name}`, es: `Ver detalles de ${name}`, tr: `${name} ayrıntılarını görüntüle`,
    de: `Details zu ${name} anzeigen`, fr: `Voir les détails de ${name}`, it: `Visualizza i dettagli di ${name}`, ru: `Открыть сведения о ${name}`,
  };
  return templates[locale];
}

export function formatMetaMinimumSample(locale: Locale, value: number) {
  const templates: Record<Locale, string> = {
    ko: `DB 전체 표본 기준: 최소 ${value}판 이상`,
    en: `Across all DB samples: at least ${value} battles`,
    ja: `DB全体サンプル基準：${value}戦以上`,
    "pt-br": `Em todas as amostras do DB: pelo menos ${value} batalhas`,
    es: `En todas las muestras del DB: al menos ${value} batallas`,
    tr: `Tüm DB örneklerinde: en az ${value} savaş`,
    de: `Über alle DB-Stichproben: mindestens ${value} Kämpfe`,
    fr: `Sur tous les échantillons du DB : au moins ${value} combats`,
    it: `Su tutti i campioni del DB: almeno ${value} battaglie`,
    ru: `По всем выборкам DB: минимум ${value} боёв`,
  };
  return templates[locale];
}

export function formatMetaMinimumOption(locale: Locale, value: number) {
  if (locale === "ko") return `${value}전 이상`;
  if (locale === "ja") return `${value}戦以上`;
  const suffix: Record<Exclude<Locale, "ko" | "ja">, string> = {
    en: "battles", "pt-br": "batalhas", es: "batallas", tr: "savaş", de: "Kämpfe",
    fr: "combats", it: "battaglie", ru: "боёв",
  };
  return `${value}+ ${suffix[locale as Exclude<Locale, "ko" | "ja">]}`;
}

export function formatMetaCandidateCount(locale: Locale, value: number) {
  const formatted = formatNumber(locale, value);
  if (locale === "ko") return `${formatted}명`;
  if (locale === "ja") return `${formatted}体`;
  const labels: Record<Exclude<Locale, "ko" | "ja">, string> = {
    en: "brawlers", "pt-br": "brawlers", es: "brawlers", tr: "savaşçı", de: "Brawler",
    fr: "brawlers", it: "brawler", ru: "бойцов",
  };
  return `${formatted} ${labels[locale as Exclude<Locale, "ko" | "ja">]}`;
}

export function formatMetaAllCandidates(locale: Locale, value: number) {
  const count = formatMetaCandidateCount(locale, value);
  const templates: Record<Locale, string> = {
    ko: `전체 ${count}`, en: `${count} total`, ja: `全体 ${count}`,
    "pt-br": `${count} no total`, es: `${count} en total`, tr: `toplam ${count}`,
    de: `${count} insgesamt`, fr: `${count} au total`, it: `${count} totali`, ru: `всего ${count}`,
  };
  return templates[locale];
}

export function formatMetaTopWinRate(locale: Locale, value: number) {
  const templates: Record<Locale, string> = {
    ko: `최고 승률 ${value}%`, en: `Top win rate ${value}%`, ja: `最高勝率 ${value}%`,
    "pt-br": `Maior taxa de vitória ${value}%`, es: `Mejor tasa de victoria ${value}%`,
    tr: `En yüksek kazanma oranı %${value}`, de: `Höchste Siegesrate ${value}%`,
    fr: `Meilleur taux de victoire ${value} %`, it: `Miglior percentuale di vittorie ${value}%`,
    ru: `Лучшая доля побед ${value}%`,
  };
  return templates[locale];
}

export function formatMetaWinRateSample(locale: Locale, winRate: number, plays: number) {
  return `${winRate}% (${formatBattles(locale, plays)})`;
}

export function formatMetaShowAll(locale: Locale, showAll: boolean, count: number) {
  if (showAll) {
    const labels: Record<Locale, string> = {
      ko: "상위 15개만 보기", en: "Show top 15 only", ja: "上位15件のみ表示",
      "pt-br": "Mostrar apenas os 15 melhores", es: "Mostrar solo los 15 mejores",
      tr: "Yalnızca ilk 15'i göster", de: "Nur die Top 15 anzeigen",
      fr: "Afficher uniquement le top 15", it: "Mostra solo i primi 15", ru: "Показать только топ-15",
    };
    return labels[locale];
  }
  const countText = formatMetaCandidateCount(locale, count);
  const labels: Record<Locale, string> = {
    ko: `전체 후보 ${countText} 보기`, en: `Show all ${countText}`, ja: `候補 ${countText}をすべて表示`,
    "pt-br": `Mostrar todos os ${countText}`, es: `Mostrar los ${countText}`, tr: `Tüm ${countText} göster`,
    de: `Alle ${countText} anzeigen`, fr: `Afficher les ${countText}`, it: `Mostra tutti i ${countText}`, ru: `Показать всех: ${countText}`,
  };
  return labels[locale];
}

export function formatConfidenceOnly(locale: Locale, value: "high" | "medium" | "low", label: string) {
  if (locale === "ko") return `${label}만`;
  if (locale === "ja") return `${label}のみ`;
  const suffix: Record<Exclude<Locale, "ko" | "ja">, string> = {
    en: "only", "pt-br": "apenas", es: "solo", tr: "yalnızca", de: "nur",
    fr: "uniquement", it: "solo", ru: "только",
  };
  const language = locale as Exclude<Locale, "ko" | "ja">;
  if (language === "pt-br" || language === "es" || language === "it") return `${suffix[language]} ${label}`;
  if (language === "ru") return `${suffix[language]}: ${label}`;
  if (language === "tr") return `${suffix[language]} ${label}`;
  if (language === "de") return `${suffix[language]} ${label}`;
  if (language === "fr") return `${label} ${suffix[language]}`;
  return `${label} ${suffix[language]}`;
}

export function formatOtherLabel(locale: Locale) {
  const labels: Record<Locale, string> = {
    ko: "기타", en: "Other", ja: "その他", "pt-br": "Outros", es: "Otros", tr: "Diğer",
    de: "Sonstige", fr: "Autres", it: "Altro", ru: "Другое",
  };
  return labels[locale];
}

export function formatDefaultSkin(locale: Locale, brawlerName: string) {
  const labels: Record<Locale, string> = {
    ko: `${brawlerName} 기본 스킨`, en: `${brawlerName} Default Skin`, ja: `${brawlerName} デフォルトスキン`,
    "pt-br": `${brawlerName} — skin padrão`, es: `${brawlerName} — skin predeterminada`,
    tr: `${brawlerName} varsayılan kostümü`, de: `${brawlerName} Standard-Skin`,
    fr: `${brawlerName} — skin par défaut`, it: `${brawlerName} — skin predefinita`, ru: `${brawlerName} — стандартный скин`,
  };
  return labels[locale];
}

export function formatCurrentBrawlerLine(locale: Locale, trophies: string, power: number) {
  const templates: Record<Locale, string> = {
    ko: `현재 ${trophies} 트로피 · 파워 ${power}`, en: `${trophies} trophies · Power ${power}`, ja: `現在 ${trophies} トロフィー · パワー ${power}`,
    "pt-br": `${trophies} troféus · Poder ${power}`, es: `${trophies} trofeos · Fuerza ${power}`,
    tr: `${trophies} kupa · Güç ${power}`, de: `${trophies} Trophäen · Power ${power}`,
    fr: `${trophies} trophées · Pouvoir ${power}`, it: `${trophies} trofei · Potenza ${power}`, ru: `${trophies} трофеев · Сила ${power}`,
  };
  return templates[locale];
}

export function formatOwnedCount(locale: Locale, value: number) {
  const formatted = formatNumber(locale, value);
  if (locale === "ko") return `${formatted}개`;
  if (locale === "ja") return `${formatted}個`;
  return formatted;
}

export function formatNoneOwned(locale: Locale, label: string) {
  const templates: Record<Locale, string> = {
    ko: `보유한 ${label}이 없습니다.`, en: `No ${label.toLowerCase()} owned.`, ja: `所持している${label}はありません。`,
    "pt-br": `Nenhum item de ${label.toLowerCase()} obtido.`, es: `No tienes ${label.toLowerCase()}.`,
    tr: `Sahip olunan ${label.toLowerCase()} yok.`, de: `Keine ${label} vorhanden.`,
    fr: `Aucun élément ${label.toLowerCase()} possédé.`, it: `Nessun elemento ${label.toLowerCase()} posseduto.`, ru: `Нет: ${label.toLowerCase()}.`,
  };
  return templates[locale];
}

export function formatTopMode(locale: Locale, mode: string) {
  const labels: Record<Locale, string> = {
    ko: `주력 모드: ${mode}`, en: `Top mode: ${mode}`, ja: `得意モード: ${mode}`,
    "pt-br": `Melhor modo: ${mode}`, es: `Mejor modo: ${mode}`, tr: `En iyi mod: ${mode}`,
    de: `Top-Modus: ${mode}`, fr: `Meilleur mode : ${mode}`, it: `Modalità migliore: ${mode}`, ru: `Лучший режим: ${mode}`,
  };
  return labels[locale];
}
