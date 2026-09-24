import {
  generatedAbilityDictById,
} from "../constants/generatedBrawlTranslations";
import {
  generatedAdditionalAbilityByIdDicts,
} from "../constants/generatedBrawlAdditionalTranslations";
import { generatedBrawlerModels } from "../constants/generatedBrawlerModels";
import type { Locale } from "../i18n/config";
import type { BrawlifyAbility, BrawlifyBrawler, BrawlifyMap } from "../types/brawlify";
import { translateAbilityName, translateBrawlerName, translateMapName, translateModeName } from "../utils/brawlTranslations";
import { selectBrowsableMaps, selectIndexableBrawlers } from "../utils/seoIndexing";
import type { QuizBrawler } from "../utils/minigames/brawlerQuiz";
import type { AbilityOwnerChoice, AbilityQuizEntry } from "../utils/minigames/abilityQuiz";
import type { MapQuizEntry } from "../utils/minigames/mapQuiz";
import { getMinigameFixtureData } from "../../e2e/fixtures/minigames";
import { getBrawlifyBrawlers, getBrawlifyMaps } from "./brawlify";

const MODEL_BASE_URL = "https://cdn.brawlify.com/";

export function isMinigameFixtureMode() {
  const enabled = process.env.MINIGAMES_E2E_FIXTURES === "1";
  if (enabled && process.env.VERCEL) throw new Error("MINIGAMES_E2E_FIXTURES cannot be enabled on Vercel");
  return enabled;
}

export function projectNameQuizBrawlers(items: readonly BrawlifyBrawler[], locale: Locale): QuizBrawler[] {
  return selectIndexableBrawlers([...items]).flatMap((brawler) => {
    if (!isValidId(brawler.id) || !nonempty(brawler.name)) return [];
    const imageUrl = [brawler.imageUrl2, brawler.imageUrl].find(isCdnImage) ?? "";
    return [{ id: brawler.id, rawName: brawler.name, displayName: translateBrawlerName(brawler.name, locale), imageUrl }];
  });
}

export function projectSilhouetteBrawlers(items: readonly BrawlifyBrawler[], locale: Locale) {
  const released = new Map(selectIndexableBrawlers([...items])
    .filter((item) => isValidId(item.id) && nonempty(item.name))
    .map((item) => [item.id, item]));
  const assetById = new Map(generatedBrawlerModels.map((asset) => [asset.brawlerId, asset]));
  return [...released.values()].flatMap((brawler) => {
    const asset = assetById.get(brawler.id);
    if (!asset || !/^brawlers\/model\/[1-9][0-9]*\.png$/.test(asset.path) || !/^[0-9a-f]{40}$/i.test(asset.blobSha)) return [];
    const imageUrl = new URL(asset.path, MODEL_BASE_URL).toString();
    return [{ id: brawler.id, rawName: brawler.name, displayName: translateBrawlerName(brawler.name, locale), imageUrl }];
  });
}

export function projectMapQuizEntries(items: readonly BrawlifyMap[], locale: Locale): MapQuizEntry[] {
  return selectBrowsableMaps([...items]).flatMap((map) => {
    const mode = map.gameMode;
    if (!isValidId(map.id) || !nonempty(map.name) || !isCdnImage(map.imageUrl) ||
      !mode || mode.disabled || !isValidId(mode.id) || !nonempty(mode.name)) return [];
    return [{
      id: map.id,
      displayName: translateMapName(map.name, locale),
      imageUrl: map.imageUrl,
      modeId: mode.id,
      modeName: translateModeName(mode.name, locale),
    }];
  });
}

export function projectAbilityQuizData(items: readonly BrawlifyBrawler[], locale: Locale, translationOverrides: {
  translate?: typeof translateAbilityName;
  hasTranslation?: (id: number, locale: Locale) => boolean;
} = {}): { abilities: AbilityQuizEntry[]; owners: AbilityOwnerChoice[] } {
  const translate = translationOverrides.translate ?? translateAbilityName;
  const translationExists = translationOverrides.hasTranslation ?? hasAbilityTranslation;
  const brawlers = selectIndexableBrawlers([...items]).filter((brawler) => isValidId(brawler.id) && nonempty(brawler.name));
  const ownerCandidates: AbilityOwnerChoice[] = brawlers.map((brawler) => ({
    id: brawler.id,
    displayName: translateBrawlerName(brawler.name, locale),
    imageUrl: [brawler.imageUrl2, brawler.imageUrl].find(isCdnImage) ?? null,
  }));
  const ownerLabelOwners = new Map<string, Set<number>>();
  for (const owner of ownerCandidates) {
    const key = normalizeEntityName(owner.displayName, locale);
    const ids = ownerLabelOwners.get(key) ?? new Set<number>();
    ids.add(owner.id);
    ownerLabelOwners.set(key, ids);
  }
  const ambiguousOwners = new Set([...ownerLabelOwners].filter(([, ids]) => ids.size > 1).flatMap(([, ids]) => [...ids]));
  const owners = ownerCandidates.filter((owner) => !ambiguousOwners.has(owner.id));
  const rawAbilities: Array<{ ability: BrawlifyAbility; ownerId: number; kind: AbilityQuizEntry["kind"] }> = [];
  for (const brawler of brawlers) {
    for (const [kind, abilities] of [["gadget", brawler.gadgets], ["star-power", brawler.starPowers]] as const) {
      for (const ability of abilities ?? []) {
        if (ability?.released === true && isValidId(ability.id) && nonempty(ability.name)) rawAbilities.push({ ability, ownerId: brawler.id, kind });
      }
    }
  }
  const ownerIdsByAbility = new Map<number, Set<number>>();
  for (const entry of rawAbilities) {
    const ids = ownerIdsByAbility.get(entry.ability.id) ?? new Set<number>();
    ids.add(entry.ownerId);
    ownerIdsByAbility.set(entry.ability.id, ids);
  }
  const seenAbilityOwner = new Set<string>();
  const translated = rawAbilities.flatMap(({ ability, ownerId, kind }) => {
    if (ownerIdsByAbility.get(ability.id)?.size !== 1 || ambiguousOwners.has(ownerId)) return [];
    const uniqueKey = ability.id + ":" + ownerId;
    if (seenAbilityOwner.has(uniqueKey)) return [];
    seenAbilityOwner.add(uniqueKey);
    if (!translationExists(ability.id, locale)) return [];
    const displayName = translate(ability.id, ability.name, locale).trim();
    if (!displayName) return [];
    const imageUrl = isCdnImage(ability.imageUrl) ? ability.imageUrl : null;
    return [{ id: ability.id, kind, ownerId, displayName, imageUrl }];
  });
  const labelOwners = new Map<string, Set<number>>();
  for (const ability of translated) {
    const key = ability.kind + ":" + normalizeEntityName(ability.displayName, locale);
    const ids = labelOwners.get(key) ?? new Set<number>();
    ids.add(ability.ownerId);
    labelOwners.set(key, ids);
  }
  const ambiguousLabels = new Set([...labelOwners].filter(([, ids]) => ids.size > 1).map(([key]) => key));
  return {
    abilities: translated.filter((ability) => !ambiguousLabels.has(ability.kind + ":" + normalizeEntityName(ability.displayName, locale))),
    owners,
  };
}

export async function loadNameQuizBrawlers(locale: Locale): Promise<QuizBrawler[]> {
  if (isMinigameFixtureMode()) return getMinigameFixtureData(locale).nameBrawlers;
  const result = await getBrawlifyBrawlers().catch(() => ({ list: [] }));
  return projectNameQuizBrawlers(result.list, locale);
}

export async function loadHubCounts() {
  if (isMinigameFixtureMode()) {
    const data = getMinigameFixtureData("ko");
    return { releasedBrawlers: data.nameBrawlers.length, silhouetteModels: data.silhouetteBrawlers.length };
  }
  const result = await getBrawlifyBrawlers().catch(() => ({ list: [] }));
  const released = selectIndexableBrawlers(result.list).filter((item) => isValidId(item.id) && nonempty(item.name));
  const modelIds = new Set(generatedBrawlerModels.map((asset) => asset.brawlerId));
  return { releasedBrawlers: released.length, silhouetteModels: released.filter((item) => modelIds.has(item.id)).length };
}

export async function loadSilhouetteBrawlers(locale: Locale) {
  if (isMinigameFixtureMode()) return getMinigameFixtureData(locale).silhouetteBrawlers;
  const result = await getBrawlifyBrawlers().catch(() => ({ list: [] }));
  return projectSilhouetteBrawlers(result.list, locale);
}

export async function loadMapQuizEntries(locale: Locale) {
  if (isMinigameFixtureMode()) return getMinigameFixtureData(locale).maps;
  const result = await getBrawlifyMaps().catch(() => ({ list: [] }));
  return projectMapQuizEntries(result.list, locale);
}

export async function loadAbilityQuizData(locale: Locale) {
  if (isMinigameFixtureMode()) {
    const data = getMinigameFixtureData(locale);
    return { abilities: data.abilities, owners: data.owners };
  }
  const result = await getBrawlifyBrawlers().catch(() => ({ list: [] }));
  return projectAbilityQuizData(result.list, locale);
}

function hasAbilityTranslation(id: number, locale: Locale) {
  const localized = locale === "ko"
    ? generatedAbilityDictById[String(id)]
    : generatedAdditionalAbilityByIdDicts[locale]?.[String(id)];
  return typeof localized === "string" && localized.trim().length > 0;
}

function normalizeEntityName(value: string, locale: Locale) {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase(locale === "pt-br" ? "pt-BR" : locale);
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidId(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isCdnImage(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "cdn.brawlify.com";
  } catch {
    return false;
  }
}
