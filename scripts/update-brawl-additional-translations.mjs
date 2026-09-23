import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE_URL = "https://api.brawlapi.com/v2/raw";
const USER_AGENT = "brawl-status-kr/1.0";
const outputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/constants/generatedBrawlAdditionalTranslations.ts",
);

const localeSources = [
  ["ja", "jp", "JP"],
  ["pt-br", "pt", "PT"],
  ["es", "es", "ES"],
  ["tr", "tr", "TR"],
  ["de", "de", "DE"],
  ["fr", "fr", "FR"],
  ["it", "it", "IT"],
  ["ru", "ru", "RU"],
];

async function getGameFile(path) {
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
  const json = await response.json();
  return json.data;
}

function getTranslation(texts, tid, key) {
  return tid ? texts[tid]?.[key] ?? null : null;
}

function lowerFirst(value) {
  return value ? value[0].toLowerCase() + value.slice(1) : value;
}

function toTitleCase(value) {
  return value
    ? value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    : value;
}

function addAlias(record, key, value) {
  if (key && value) record[key] = value;
}

function sortRecord(record) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function sortNestedRecord(record) {
  return Object.fromEntries(
    Object.entries(record).map(([locale, entries]) => [locale, sortRecord(entries)]),
  );
}

const [
  englishTexts,
  cards,
  characters,
  locations,
  modeVariations,
  gearBoosts,
  skins,
  skinConfs,
  ...localizedTexts
] =
  await Promise.all([
    getGameFile("localization/texts"),
    getGameFile("csv_logic/cards"),
    getGameFile("csv_logic/characters"),
    getGameFile("csv_logic/locations"),
    getGameFile("csv_logic/game_mode_variations"),
    getGameFile("csv_logic/gear_boosts"),
    getGameFile("csv_logic/skins"),
    getGameFile("csv_logic/skin_confs"),
    ...localeSources.map(([, endpoint]) => getGameFile(`localization/${endpoint}`)),
  ]);

const brawlers = {};
const brawlerDescriptions = {};
const maps = {};
const modes = {};
const modeDescriptions = {};
const abilitiesById = {};
const gearsById = {};
const skinsById = {};

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

const englishAbilitiesById = {};
for (const card of Object.values(cards)) {
  if (
    (card.MetaType !== 4 && card.MetaType !== 5 && card.MetaType !== 6) ||
    card.Disabled
  ) {
    continue;
  }
  const englishName = getTranslation(englishTexts, card.TID, "EN");
  if (englishName) englishAbilitiesById[String(card.id)] = englishName;
}
abilitiesById.en = englishAbilitiesById;

const englishSkinsById = {};
for (const skin of Object.values(skins)) {
  if (skin.Disabled) continue;
  const skinConf = skinConfByName.get(skin.Conf);
  const character = skinConf ? activeCharactersByName.get(skinConf.Character) : null;
  if (!character) continue;
  const englishName = getTranslation(englishTexts, skin.TID, "EN");
  if (englishName) englishSkinsById[String(skin.id)] = englishName;
}
skinsById.en = englishSkinsById;

for (const [index, [locale, , field]] of localeSources.entries()) {
  const texts = localizedTexts[index];
  const localeBrawlers = {};
  const localeBrawlerDescriptions = {};
  const localeMaps = {};
  const localeModes = {};
  const localeModeDescriptions = {};
  const localeAbilitiesById = {};
  const localeGearsById = {};
  const localeSkinsById = {};

  for (const mode of Object.values(modeVariations)) {
    const englishName = getTranslation(englishTexts, mode.TID, "EN");
    const localizedName = getTranslation(texts, mode.TID, field);
    if (!englishName || !localizedName) continue;

    const modeKey = mode.Name === "Showdown" ? "soloShowdown" : lowerFirst(mode.Name);
    addAlias(localeModes, mode.Name, localizedName);
    addAlias(localeModes, mode.ShortName, localizedName);
    addAlias(localeModes, modeKey, localizedName);
    addAlias(localeModes, englishName, localizedName);
    addAlias(localeModes, toTitleCase(englishName), localizedName);

    const localizedDescription =
      getTranslation(texts, mode.IntroDescText, field) ??
      getTranslation(texts, mode.IntroDescText2, field);
    addAlias(localeModeDescriptions, mode.Name, localizedDescription);
    addAlias(localeModeDescriptions, mode.ShortName, localizedDescription);
    addAlias(localeModeDescriptions, modeKey, localizedDescription);
    addAlias(localeModeDescriptions, englishName, localizedDescription);
    addAlias(localeModeDescriptions, toTitleCase(englishName), localizedDescription);
  }

  for (const location of Object.values(locations)) {
    if (location.Disabled) continue;
    const englishName = getTranslation(englishTexts, location.TID, "EN");
    const localizedName = getTranslation(texts, location.TID, field);
    if (englishName && localizedName) localeMaps[englishName] = localizedName;
  }

  for (const character of Object.values(characters)) {
    const englishName = getTranslation(englishTexts, character.TID, "EN");
    const localizedName = getTranslation(texts, character.TID, field);
    if (!englishName || character.Disabled || !character.ItemName || !localizedName) continue;
    localeBrawlers[englishName.toUpperCase()] = localizedName;
    localeBrawlers[englishName] = localizedName;

    const localizedDescription = getTranslation(texts, `${character.TID}_DESC`, field);
    addAlias(localeBrawlerDescriptions, englishName.toUpperCase(), localizedDescription);
    addAlias(localeBrawlerDescriptions, englishName, localizedDescription);
  }

  for (const card of Object.values(cards)) {
    if (
      (card.MetaType !== 4 && card.MetaType !== 5 && card.MetaType !== 6) ||
      card.Disabled
    ) {
      continue;
    }
    const localizedName = getTranslation(texts, card.TID, field);
    if (localizedName) localeAbilitiesById[String(card.id)] = localizedName;
  }

  for (const gear of Object.values(gearBoosts)) {
    const localizedName = getTranslation(texts, gear.TID, field);
    if (localizedName) localeGearsById[String(gear.id)] = localizedName;
  }

  for (const skin of Object.values(skins)) {
    if (skin.Disabled) continue;
    const skinConf = skinConfByName.get(skin.Conf);
    const character = skinConf ? activeCharactersByName.get(skinConf.Character) : null;
    if (!character) continue;
    const localizedSkinName = getTranslation(texts, skin.TID, field);
    if (localizedSkinName) localeSkinsById[String(skin.id)] = localizedSkinName;
  }

  brawlers[locale] = localeBrawlers;
  brawlerDescriptions[locale] = localeBrawlerDescriptions;
  maps[locale] = localeMaps;
  modes[locale] = localeModes;
  modeDescriptions[locale] = localeModeDescriptions;
  abilitiesById[locale] = localeAbilitiesById;
  gearsById[locale] = localeGearsById;
  skinsById[locale] = localeSkinsById;
}

const source = `// Generated by scripts/update-brawl-additional-translations.mjs.
// Do not edit manually. Run: npm run translations:additional:update

export const generatedAdditionalBrawlerDicts: Record<string, Record<string, string>> = ${JSON.stringify(
  sortNestedRecord(brawlers),
  null,
  2,
)};

export const generatedAdditionalBrawlerDescriptionDicts: Record<string, Record<string, string>> = ${JSON.stringify(
  sortNestedRecord(brawlerDescriptions),
  null,
  2,
)};

export const generatedAdditionalMapDicts: Record<string, Record<string, string>> = ${JSON.stringify(
  sortNestedRecord(maps),
  null,
  2,
)};

export const generatedAdditionalModeDicts: Record<string, Record<string, string>> = ${JSON.stringify(
  sortNestedRecord(modes),
  null,
  2,
)};

export const generatedAdditionalModeDescriptionDicts: Record<string, Record<string, string>> = ${JSON.stringify(
  sortNestedRecord(modeDescriptions),
  null,
  2,
)};

export const generatedAdditionalAbilityByIdDicts: Record<string, Record<string, string>> = ${JSON.stringify(
  sortNestedRecord(abilitiesById),
  null,
  2,
)};

export const generatedAdditionalGearByIdDicts: Record<string, Record<string, string>> = ${JSON.stringify(
  sortNestedRecord(gearsById),
  null,
  2,
)};

export const generatedAdditionalSkinByIdDicts: Record<string, Record<string, string>> = ${JSON.stringify(
  sortNestedRecord(skinsById),
  null,
  2,
)};
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, source, "utf8");

for (const [locale] of localeSources) {
  console.log(
    `${locale}: ${Object.keys(brawlers[locale]).length} brawler aliases, ${Object.keys(brawlerDescriptions[locale]).length} brawler descriptions, ${Object.keys(maps[locale]).length} maps, ${Object.keys(modes[locale]).length} mode aliases, ${Object.keys(modeDescriptions[locale]).length} mode descriptions, ${Object.keys(abilitiesById[locale]).length} abilities, ${Object.keys(gearsById[locale]).length} gears, ${Object.keys(skinsById[locale]).length} skins`,
  );
}
