import {
  generatedAbilityDictById,
  generatedAbilityDictByName,
  generatedSkinNameById,
} from "../constants/generatedBrawlTranslations";

const abilityNameFallbackDict: Record<string, string> = {
  "SECOND WAVE": "두 번째 파동",
  "TWIN SNAKES": "쌍둥이 뱀",
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

export function translateAbilityName(id: number | string | undefined, name: string) {
  return (
    (id === undefined ? undefined : generatedAbilityDictById[String(id)]) ??
    generatedAbilityDictByName[name] ??
    abilityNameFallbackDict[name] ??
    name
  );
}

export function translateGearName(id: number | string | undefined, name: string) {
  return (id === undefined ? undefined : gearNameById[String(id)]) ?? name;
}

export function translateSkinName(id: number | string | undefined, name: string) {
  return (id === undefined ? undefined : generatedSkinNameById[String(id)]) ?? name;
}
