import { brawlerDict, mapDict, modeDict } from "../constants/brawl";
import {
  generatedAbilityDictById,
  generatedAbilityDictByName,
  generatedBrawlerDescriptionDict,
  generatedGearNameById,
  generatedModeDescriptionDict,
  generatedModeDisplayDict,
  generatedSkinNameById,
} from "../constants/generatedBrawlTranslations";
import {
  generatedEnglishModeDisplayDict,
  generatedJapaneseBrawlerDict,
  generatedJapaneseMapDict,
  generatedJapaneseModeDisplayDict,
} from "../constants/generatedBrawlJapaneseTranslations";
import {
  generatedAdditionalAbilityByIdDicts,
  generatedAdditionalBrawlerDicts,
  generatedAdditionalBrawlerDescriptionDicts,
  generatedAdditionalGearByIdDicts,
  generatedAdditionalMapDicts,
  generatedAdditionalModeDicts,
  generatedAdditionalModeDescriptionDicts,
  generatedAdditionalSkinByIdDicts,
} from "../constants/generatedBrawlAdditionalTranslations";
import { numberLocales, type Locale } from "../i18n/config";

const abilityNameFallbackDict: Record<string, string> = {
  "A STARR IS BORN": "스타 탄생",
  "BOUNCY BALL": "통통 튀는 공",
  "CROWDKILL": "군중 처치",
  "DUSK RUNNERS": "황혼의 질주자",
  "FLOATY TIME": "둥실둥실 시간",
  "MASTER OF SHADOWS": "그림자의 달인",
  "MYSTICAL STARR TECHNIQUE": "신비한 스타 기술",
  "NAJIA JAR": "나지아 항아리",
  "OIL CHANGE": "오일 교체",
  "POISON PUDDLES": "독 웅덩이",
  "POISONOUS PROTECTOR": "맹독의 수호자",
  "POWER LEVEL MAXIMUM": "파워 레벨 최대치",
  "SECOND WAVE": "두 번째 파동",
  "SHINING STARR OF FRIENDSHIP AND JUSTICE": "우정과 정의의 빛나는 스타",
  "SPIRITUAL HEALING": "영적 치유",
  "THE DARKEST STARR": "가장 어두운 스타",
  "TOSS UP": "공중 띄우기",
  "TWIN SNAKES": "쌍둥이 뱀",
  "UNSTOPPABALL": "멈출 수 없는 공",
  "VENOMOUS": "독기",
  "VULGAR DISPLAY OF PUNCH": "강렬한 주먹 과시",
  "WALL OF SOUND": "소리의 장벽",
};

const gearNameById: Record<string, string> = {
  "62000000": "속도",
  "62000001": "회복",
  "62000002": "피해",
  "62000003": "시야",
  "62000004": "보호막",
  "62000005": "재장전 속도",
  "62000006": "특수 공격 충전",
  "62000007": "단단한 머리",
  "62000008": "매콤한 손맛",
  "62000009": "끈질긴 독",
  "62000010": "끈끈이 가시",
  "62000011": "자욱한 연기",
  "62000012": "기진맥진 폭풍",
  "62000013": "끈끈이 오일",
  "62000014": "펫 파워",
  "62000015": "네쌍둥이",
  "62000016": "슈퍼 터렛",
  "62000017": "가젯 재사용 대기 시간",
  "62000018": "박쥐 폭풍",
};

const gearNameFallbackDict: Record<string, string> = {
  DAMAGE: "피해",
  "ENDURING TOXINS": "끈질긴 독",
  "EXHAUSTING STORM": "기진맥진 폭풍",
  "GADGET CHARGE": "가젯 충전",
  HEALTH: "회복",
  "LINGERING SMOKE": "자욱한 연기",
  "PET POWER": "펫 파워",
  "QUADRUPLETS": "네쌍둥이",
  "RELOAD SPEED": "재장전 속도",
  SHIELD: "보호막",
  "SPEED GEAR": "속도",
  SPEED: "속도",
  "STICKY OIL": "끈끈이 오일",
  "SUPER CHARGE": "특수 공격 충전",
  "SUPER TURRET": "슈퍼 터렛",
  "TALK TO THE HAND": "단단한 머리",
  VISION: "시야",
};

const rarityNameDict: Record<string, string> = {
  Common: "일반",
  Epic: "영웅",
  Legendary: "전설",
  Mythic: "신화",
  Rare: "희귀",
  "Super Rare": "초희귀",
  "Ultra Legendary": "울트라 전설",
  Unknown: "알 수 없음",
};

const brawlerClassNameDict: Record<string, string> = {
  Artillery: "투척수",
  Assassin: "어쌔신",
  Controller: "컨트롤러",
  "Damage Dealer": "대미지 딜러",
  Marksman: "저격수",
  Support: "서포터",
  Tank: "탱커",
  Unknown: "알 수 없음",
};

const rarityNamesByLocale: Partial<Record<Locale, Record<string, string>>> = {
  en: {
    Common: "Common", Epic: "Epic", Legendary: "Legendary", Mythic: "Mythic",
    Rare: "Rare", "Super Rare": "Super Rare", "Ultra Legendary": "Ultra Legendary", Unknown: "Unknown",
  },
  ja: {
    Common: "ノーマル", Epic: "エピック", Legendary: "レジェンド", Mythic: "ミシック",
    Rare: "レア", "Super Rare": "スーパーレア", "Ultra Legendary": "ウルトラレジェンド", Unknown: "不明",
  },
  "pt-br": {
    Common: "Comum", Epic: "Épico", Legendary: "Lendário", Mythic: "Mítico",
    Rare: "Raro", "Super Rare": "Super-raro", "Ultra Legendary": "Ultralendário", Unknown: "Desconhecido",
  },
  es: {
    Common: "Común", Epic: "Épico", Legendary: "Legendario", Mythic: "Mítico",
    Rare: "Raro", "Super Rare": "Superraro", "Ultra Legendary": "Ultralegendario", Unknown: "Desconocido",
  },
  tr: {
    Common: "Yaygın", Epic: "Epik", Legendary: "Efsanevi", Mythic: "Mitik",
    Rare: "Nadir", "Super Rare": "Süper Nadir", "Ultra Legendary": "Ultra Efsanevi", Unknown: "Bilinmiyor",
  },
  de: {
    Common: "Gewöhnlich", Epic: "Episch", Legendary: "Legendär", Mythic: "Mythisch",
    Rare: "Selten", "Super Rare": "Superselten", "Ultra Legendary": "Ultralegendär", Unknown: "Unbekannt",
  },
  fr: {
    Common: "Commun", Epic: "Épique", Legendary: "Légendaire", Mythic: "Mythique",
    Rare: "Rare", "Super Rare": "Super rare", "Ultra Legendary": "Ultra légendaire", Unknown: "Inconnu",
  },
  it: {
    Common: "Comune", Epic: "Epico", Legendary: "Leggendario", Mythic: "Mitico",
    Rare: "Raro", "Super Rare": "Super raro", "Ultra Legendary": "Ultra leggendario", Unknown: "Sconosciuto",
  },
  ru: {
    Common: "Обычный", Epic: "Эпический", Legendary: "Легендарный", Mythic: "Мифический",
    Rare: "Редкий", "Super Rare": "Сверхредкий", "Ultra Legendary": "Ультралегендарный", Unknown: "Неизвестно",
  },
};

const classNamesByLocale: Partial<Record<Locale, Record<string, string>>> = {
  en: {
    Artillery: "Artillery", Assassin: "Assassin", Controller: "Controller", "Damage Dealer": "Damage Dealer",
    Marksman: "Marksman", Support: "Support", Tank: "Tank", Unknown: "Unknown",
  },
  ja: {
    Artillery: "投げ", Assassin: "アサシン", Controller: "コントローラー", "Damage Dealer": "ダメージディーラー",
    Marksman: "スナイパー", Support: "サポート", Tank: "タンク", Unknown: "不明",
  },
  "pt-br": {
    Artillery: "Artilharia", Assassin: "Assassino", Controller: "Controle", "Damage Dealer": "Dano",
    Marksman: "Atirador", Support: "Suporte", Tank: "Tanque", Unknown: "Desconhecido",
  },
  es: {
    Artillery: "Artillería", Assassin: "Asesino", Controller: "Control", "Damage Dealer": "Daño",
    Marksman: "Tirador", Support: "Apoyo", Tank: "Tanque", Unknown: "Desconocido",
  },
  tr: {
    Artillery: "Topçu", Assassin: "Suikastçı", Controller: "Kontrolcü", "Damage Dealer": "Hasar Veren",
    Marksman: "Nişancı", Support: "Destek", Tank: "Tank", Unknown: "Bilinmiyor",
  },
  de: {
    Artillery: "Artillerie", Assassin: "Assassine", Controller: "Kontrolle", "Damage Dealer": "Schadensausteiler",
    Marksman: "Scharfschütze", Support: "Unterstützung", Tank: "Tank", Unknown: "Unbekannt",
  },
  fr: {
    Artillery: "Artillerie", Assassin: "Assassin", Controller: "Contrôle", "Damage Dealer": "Dégâts",
    Marksman: "Tireur", Support: "Soutien", Tank: "Tank", Unknown: "Inconnu",
  },
  it: {
    Artillery: "Artiglieria", Assassin: "Assassino", Controller: "Controllo", "Damage Dealer": "Danno",
    Marksman: "Tiratore", Support: "Supporto", Tank: "Tank", Unknown: "Sconosciuto",
  },
  ru: {
    Artillery: "Артиллерия", Assassin: "Убийца", Controller: "Контроль", "Damage Dealer": "Урон",
    Marksman: "Стрелок", Support: "Поддержка", Tank: "Танк", Unknown: "Неизвестно",
  },
};

const brawlerNameFallbackDict: Record<string, string> = {
  UNKNOWN: "알 수 없음",
};

const brawlerDescriptionFallbackDict: Record<string, string> = {
  "BUZZ LIGHTYEAR":
    "버즈 라이트이어가 스타 파크에 도착했습니다! 선물 가게에 우연히 배송되며 여정을 시작한 버즈는 세 가지 브롤링 모드로 브롤러들에게 강한 인상을 남기고 있습니다!",
};

const modeNameFallbackDict: Record<string, string> = {
  "5V5 BRAWL BALL": "5대5 브롤 볼",
  "5V5 GEM GRAB": "5대5 젬 그랩",
  "5V5 KNOCKOUT": "5대5 녹아웃",
  "5V5 WIPEOUT": "5대5 와이프아웃",
  BOUNTY: "바운티",
  "BRAWL BALL": "브롤 볼",
  DUELS: "듀얼",
  "DUO SHOWDOWN": "듀오 쇼다운",
  FRIENDLY: "친선",
  "FRIENDLY BATTLE": "친선 경기",
  "GEM GRAB": "젬 그랩",
  HEIST: "하이스트",
  "HOT ZONE": "핫 존",
  KNOCKOUT: "녹아웃",
  "SOLO SHOWDOWN": "솔로 쇼다운",
  "TRIO SHOWDOWN": "트리오 쇼다운",
  WIPEOUT: "와이프아웃",
};

const skinNameFallbackDict: Record<string, string> = {
  InsectManBrawlentineChroma1: "곤충맨 브롤렌타인 크로마 1",
  InsectManBrawlentineChroma2: "곤충맨 브롤렌타인 크로마 2",
};

function cleanName(name: string | null | undefined) {
  return name?.trim() ?? "";
}

function lookupByName(record: Record<string, string>, name: string | null | undefined) {
  const clean = cleanName(name);
  if (!clean) {
    return undefined;
  }

  return record[clean] ?? record[clean.toUpperCase()];
}

const normalizedMapLookups = new WeakMap<Record<string, string>, Map<string, string | null>>();

function normalizeMapKey(name: string) {
  return name.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function lookupMapName(record: Record<string, string>, name: string) {
  const exact = lookupByName(record, name);
  if (exact) return exact;

  let lookup = normalizedMapLookups.get(record);
  if (!lookup) {
    lookup = new Map();
    for (const [key, value] of Object.entries(record)) {
      const normalized = normalizeMapKey(key);
      if (!normalized) continue;
      const previous = lookup.get(normalized);
      lookup.set(normalized, previous === undefined || previous === value ? value : null);
    }
    normalizedMapLookups.set(record, lookup);
  }
  return lookup.get(normalizeMapKey(name)) ?? undefined;
}

export function translateBrawlerName(
  name: string | null | undefined,
  locale: Locale = "ko",
) {
  const clean = cleanName(name);
  if (locale === "en") return formatEnglishDisplayName(clean);
  if (locale === "ja") {
    return lookupByName(generatedJapaneseBrawlerDict, clean) ?? clean;
  }
  const localizedBrawlers = generatedAdditionalBrawlerDicts[locale];
  if (localizedBrawlers) {
    return formatLocalizedDisplayName(
      lookupByName(localizedBrawlers, clean) ?? clean,
      locale,
    );
  }
  return lookupByName(brawlerDict, clean) ?? lookupByName(brawlerNameFallbackDict, clean) ?? clean;
}

export function translateMapName(
  name: string | null | undefined,
  locale: Locale = "ko",
) {
  const clean = cleanName(name);
  if (locale === "en") return clean;
  if (locale === "ja") {
    return lookupMapName(generatedJapaneseMapDict, clean) ?? clean;
  }
  const localizedMaps = generatedAdditionalMapDicts[locale];
  if (localizedMaps) return lookupMapName(localizedMaps, clean) ?? clean;
  return lookupMapName(mapDict, clean) ?? clean;
}

export function translateModeName(
  name: string | null | undefined,
  locale: Locale = "ko",
) {
  const clean = cleanName(name);
  if (locale === "en") {
    return formatEnglishDisplayName(
      lookupByName(generatedEnglishModeDisplayDict, clean) ?? clean,
    );
  }
  if (locale === "ja") {
    return lookupByName(generatedJapaneseModeDisplayDict, clean) ?? clean;
  }
  const localizedModes = generatedAdditionalModeDicts[locale];
  if (localizedModes) {
    return formatLocalizedDisplayName(
      lookupByName(localizedModes, clean) ?? clean,
      locale,
    );
  }
  return (
    lookupByName(modeDict, clean) ??
    lookupByName(generatedModeDisplayDict, clean) ??
    lookupByName(modeNameFallbackDict, clean) ??
    clean
  );
}

function formatEnglishDisplayName(value: string) {
  if (!value || value !== value.toUpperCase()) return value;
  if (value === "8-BIT") return value;
  return value
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, prefix: string, letter: string) =>
      `${prefix}${letter.toUpperCase()}`,
    )
    .replace(/\b5v5\b/gi, "5v5")
    .replace(/\b3v3\b/gi, "3v3");
}

function formatLocalizedDisplayName(value: string, locale: Locale) {
  if (!value || value !== value.toLocaleUpperCase(numberLocales[locale])) return value;
  if (value === "8-BIT") return value;
  const localeName = numberLocales[locale];
  return value
    .toLocaleLowerCase(localeName)
    .replace(/(^|[\s-])(\p{L})/gu, (_, prefix: string, letter: string) =>
      `${prefix}${letter.toLocaleUpperCase(localeName)}`,
    )
    .replace(/\b5v5\b/giu, "5v5")
    .replace(/\b3v3\b/giu, "3v3");
}

function formatLocalizedGearName(value: string, locale: Locale) {
  if (locale === "de" || locale === "ja") return formatLocalizedDisplayName(value, locale);
  if (!value || value !== value.toLocaleUpperCase(numberLocales[locale])) return value;
  const lowered = value.toLocaleLowerCase(numberLocales[locale]);
  return lowered.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase(numberLocales[locale]));
}

export function translateBrawlerDescription(
  name: string | null | undefined,
  fallback: string | null | undefined,
  locale: Locale = "ko",
) {
  const clean = cleanName(name);
  if (locale === "en") return cleanName(fallback);
  const localizedDescriptions = generatedAdditionalBrawlerDescriptionDicts[locale];
  if (localizedDescriptions) {
    return lookupByName(localizedDescriptions, clean) ?? cleanName(fallback);
  }
  return (
    lookupByName(generatedBrawlerDescriptionDict, clean) ??
    lookupByName(brawlerDescriptionFallbackDict, clean) ??
    cleanName(fallback)
  );
}

export function translateModeDescription(
  name: string | null | undefined,
  fallback: string | null | undefined,
  locale: Locale = "ko",
) {
  const clean = cleanName(name);
  if (locale === "en") return cleanName(fallback);
  const localizedDescriptions = generatedAdditionalModeDescriptionDicts[locale];
  if (localizedDescriptions) {
    return lookupByName(localizedDescriptions, clean) ?? cleanName(fallback);
  }
  return lookupByName(generatedModeDescriptionDict, clean) ?? cleanName(fallback);
}

export function translateRarityName(name: string | null | undefined, locale: Locale = "ko") {
  const clean = cleanName(name);
  if (locale !== "ko") return rarityNamesByLocale[locale]?.[clean] ?? clean;
  return lookupByName(rarityNameDict, clean) ?? clean;
}

export function translateBrawlerClassName(name: string | null | undefined, locale: Locale = "ko") {
  const clean = cleanName(name);
  if (locale !== "ko") return classNamesByLocale[locale]?.[clean] ?? clean;
  return lookupByName(brawlerClassNameDict, clean) ?? clean;
}

export function translateAbilityName(
  id: number | string | undefined,
  name: string,
  locale: Locale = "ko",
) {
  const clean = cleanName(name);
  if (locale !== "ko") {
    return formatLocalizedDisplayName(
      generatedAdditionalAbilityByIdDicts[locale]?.[String(id)] ?? clean,
      locale,
    );
  }
  return (
    (id === undefined ? undefined : generatedAbilityDictById[String(id)]) ??
    lookupByName(generatedAbilityDictByName, clean) ??
    lookupByName(abilityNameFallbackDict, clean) ??
    clean
  );
}

export function translateGearName(
  id: number | string | undefined,
  name: string,
  locale: Locale = "ko",
) {
  const clean = cleanName(name);
  if (locale !== "ko") {
    return formatLocalizedGearName(
      generatedAdditionalGearByIdDicts[locale]?.[String(id)] ?? clean,
      locale,
    );
  }
  return (
    (id === undefined ? undefined : generatedGearNameById[String(id)]) ??
    (id === undefined ? undefined : gearNameById[String(id)]) ??
    lookupByName(gearNameFallbackDict, clean) ??
    clean
  );
}

export function translateSkinName(
  id: number | string | undefined,
  name: string,
  locale: Locale = "ko",
) {
  const clean = cleanName(name);
  if (locale !== "ko") {
    return formatLocalizedDisplayName(
      generatedAdditionalSkinByIdDicts[locale]?.[String(id)] ?? clean,
      locale,
    );
  }
  return (
    (id === undefined ? undefined : generatedSkinNameById[String(id)]) ??
    lookupByName(skinNameFallbackDict, clean) ??
    clean
  );
}
