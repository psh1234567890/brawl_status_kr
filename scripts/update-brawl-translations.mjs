import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE_URL = "https://api.brawlapi.com/v2/raw";
const USER_AGENT = "brawl-status-kr/1.0";
const outputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/constants/generatedBrawlTranslations.ts",
);
const skinCatalogOutputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/constants/generatedSkinCatalog.ts",
);

async function getGameFile(path) {
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }

  const json = await response.json();
  return json.data;
}

function getTranslation(texts, tid, key) {
  return tid ? texts[tid]?.[key] ?? null : null;
}

function lowerFirst(value) {
  return value ? value[0].toLowerCase() + value.slice(1) : value;
}

function sortRecord(record) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function toTsRecord(name, value) {
  return `export const ${name}: Record<string, string> = ${JSON.stringify(
    sortRecord(value),
    null,
    2,
  )};`;
}

const [
  englishTexts,
  koreanTexts,
  cards,
  characters,
  locations,
  modeVariations,
  skins,
  skinConfs,
] =
  await Promise.all([
    getGameFile("localization/texts.json"),
    getGameFile("localization/kr.json"),
    getGameFile("csv_logic/cards.json"),
    getGameFile("csv_logic/characters.json"),
    getGameFile("csv_logic/locations.json"),
    getGameFile("csv_logic/game_mode_variations.json"),
    getGameFile("csv_logic/skins.json"),
    getGameFile("csv_logic/skin_confs.json"),
  ]);

const mapDict = {};
const mapToModeDict = {};
const modeDict = {};
const modeByVariation = {};
const abilityDictById = {};
const abilityDictByName = {};
const brawlerImageIdByName = {};
const skinNameById = {};

for (const mode of Object.values(modeVariations)) {
  const koreanName = getTranslation(koreanTexts, mode.TID, "KR");
  if (!koreanName || mode.Disabled) {
    continue;
  }

  const modeKey = mode.Name === "Showdown" ? "soloShowdown" : lowerFirst(mode.Name);
  modeDict[modeKey] = koreanName;
  modeByVariation[mode.Name] = koreanName;
}

for (const location of Object.values(locations)) {
  const englishName = getTranslation(englishTexts, location.TID, "EN");
  const koreanName = getTranslation(koreanTexts, location.TID, "KR");
  if (!englishName || !koreanName) {
    continue;
  }

  mapDict[englishName] = koreanName;

  const koreanMode = modeByVariation[location.GameModeVariation];
  if (koreanMode) {
    mapToModeDict[englishName] = koreanMode;
  }
}

for (const card of Object.values(cards)) {
  if (
    (card.MetaType !== 4 && card.MetaType !== 5 && card.MetaType !== 6) ||
    card.Disabled
  ) {
    continue;
  }

  const englishName = getTranslation(englishTexts, card.TID, "EN");
  const koreanName = getTranslation(koreanTexts, card.TID, "KR");
  if (!englishName || !koreanName) {
    continue;
  }

  abilityDictById[String(card.id)] = koreanName;
  abilityDictByName[englishName] = koreanName;
}

for (const character of Object.values(characters)) {
  const englishName = getTranslation(englishTexts, character.TID, "EN");
  if (!englishName || character.Disabled || !character.ItemName) {
    continue;
  }

  const name = englishName.toUpperCase();
  if (!brawlerImageIdByName[name]) {
    brawlerImageIdByName[name] = String(character.id);
  }
}

const activeCharactersByName = new Map(
  Object.values(characters)
    .filter(
      (character) =>
        character.Type === "Hero" &&
        !character.Disabled &&
        character.ItemName,
    )
    .map((character) => [character.Name, character]),
);
const skinConfByName = new Map(
  Object.values(skinConfs).map((skinConf) => [skinConf.Name, skinConf]),
);
const skinCatalog = [];

for (const skin of Object.values(skins)) {
  if (skin.Disabled) {
    continue;
  }

  const skinConf = skinConfByName.get(skin.Conf);
  const character = skinConf
    ? activeCharactersByName.get(skinConf.Character)
    : null;
  if (!character) {
    continue;
  }

  const brawlerName =
    getTranslation(englishTexts, character.TID, "EN") ?? character.ItemName;
  const brawlerNameKo =
    getTranslation(koreanTexts, character.TID, "KR") ?? brawlerName;
  const isDefault = character.DefaultSkin === skin.Name;
  const skinName =
    getTranslation(koreanTexts, skin.TID, "KR") ??
    getTranslation(englishTexts, skin.TID, "EN") ??
    (isDefault ? `${brawlerNameKo} 기본 스킨` : skin.Name);

  skinNameById[String(skin.id)] = skinName;
  skinCatalog.push({
    id: skin.id,
    name: skinName,
    brawlerId: character.id,
    brawlerName,
    brawlerNameKo,
    rarity: skin.Rarity ?? "DEFAULT",
    gems: skin.PriceGems,
    bling: skin.PriceBling,
    coins: skin.PriceCoins,
    isDefault,
    isCatalogReleased: !skin.DisableCatalogRelease,
  });
}

const source = `// Generated by scripts/update-brawl-translations.mjs.
// Do not edit manually. Run: npm run translations:update

${toTsRecord("generatedMapDict", mapDict)}

${toTsRecord("generatedMapToModeDict", mapToModeDict)}

${toTsRecord("generatedModeDict", modeDict)}

${toTsRecord("generatedAbilityDictById", abilityDictById)}

${toTsRecord("generatedAbilityDictByName", abilityDictByName)}

${toTsRecord("generatedBrawlerImageIdByName", brawlerImageIdByName)}

${toTsRecord("generatedSkinNameById", skinNameById)}
`;

const skinCatalogSource = `// Generated by scripts/update-brawl-translations.mjs.
// Do not edit manually. Run: npm run translations:update

export interface GeneratedSkinCatalogItem {
  id: number;
  name: string;
  brawlerId: number;
  brawlerName: string;
  brawlerNameKo: string;
  rarity: string;
  gems: number;
  bling: number;
  coins: number;
  isDefault: boolean;
  isCatalogReleased: boolean;
}

export const generatedSkinCatalog: GeneratedSkinCatalogItem[] = ${JSON.stringify(
  skinCatalog,
  null,
  2,
)};
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, source, "utf8");
await writeFile(skinCatalogOutputPath, skinCatalogSource, "utf8");

console.log(
  `Generated ${Object.keys(mapDict).length} maps, ${Object.keys(modeDict).length} modes, ${Object.keys(abilityDictById).length} abilities, ${Object.keys(brawlerImageIdByName).length} brawler image IDs, and ${skinCatalog.length} skins.`,
);
