import "server-only";

import type { Locale } from "../i18n/config";
import { translateBrawlerName } from "../utils/brawlTranslations";
import type { BrawlifyBrawler } from "../types/brawlify";
import { isMinigameFixtureMode } from "./minigames";
import { getBrawlifyBrawlers } from "./brawlify";
import { releaseChronology } from "../utils/minigames/releaseChronology";
import type { ComparisonEntry } from "../utils/minigames/comparisonQuiz";

const RAW_CHARACTERS = "https://api.brawlapi.com/game/csv_logic/characters.json";
const cdn = "https://cdn.brawlify.com/";

type RawCharacter = { id?: unknown; Type?: unknown; Hitpoints?: unknown; Disabled?: unknown };

function safeBrawlerList(list: BrawlifyBrawler[], locale: Locale) {
  const seen = new Set<number>();
  return list.filter(b => {
    if (b.released === false || !Number.isSafeInteger(b.id) || b.id <= 0 || !b.name?.trim() || seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  }).map(b => ({
    id: b.id,
    rawName: b.name,
    displayName: translateBrawlerName(b.name, locale),
    imageUrl: b.imageUrl2?.startsWith(cdn) ? b.imageUrl2 : b.imageUrl?.startsWith(cdn) ? b.imageUrl : "",
  }));
}

export function projectReleaseEntries(list: BrawlifyBrawler[], locale: Locale): ComparisonEntry[] {
  return safeBrawlerList(list, locale).flatMap(b => {
    const date = releaseChronology[b.rawName.trim().toUpperCase()];
    if (!date || !/^20\d{2}-\d{2}-\d{2}$/.test(date)) return [];
    const epochDay = Date.parse(date + "T00:00:00Z") / 86_400_000;
    if (!Number.isSafeInteger(epochDay)) return [];
    return [{ id: b.id, displayName: b.displayName, imageUrl: b.imageUrl, value: epochDay }];
  });
}

export function projectHealthEntries(list: BrawlifyBrawler[], raw: Record<string, RawCharacter>, locale: Locale): ComparisonEntry[] {
  const byId = new Map<number, number>();
  for (const item of Object.values(raw)) {
    if (!Number.isSafeInteger(item.id) || !Number.isSafeInteger(item.Hitpoints) ||
      Number(item.Hitpoints) <= 0 || Number(item.Hitpoints) > 100_000 || item.Type !== "Hero" ||
      item.Disabled !== false) continue;
    byId.set(Number(item.id), Number(item.Hitpoints));
  }
  return safeBrawlerList(list, locale).flatMap(b => {
    const value = byId.get(b.id);
    return value === undefined ? [] : [{ id: b.id, displayName: b.displayName, imageUrl: b.imageUrl, value }];
  });
}

function fixtureEntries(kind: "higher-lower" | "release-order"): ComparisonEntry[] {
  // Deterministic, test-only questions. Never enabled on Vercel.
  return Array.from({ length: 30 }, (_, i) => ({
    id: 16000000 + i, displayName: "Fixture Brawler " + (i + 1),
    imageUrl: "", value: kind === "higher-lower" ? 2000 + i * 250 : 18000 + i * 31,
  }));
}

export async function loadComparisonEntries(kind: "higher-lower" | "release-order", locale: Locale): Promise<ComparisonEntry[]> {
  if (isMinigameFixtureMode()) return fixtureEntries(kind);
  const catalog = await getBrawlifyBrawlers().catch(() => ({ list: [] as BrawlifyBrawler[] }));
  if (kind === "release-order") return projectReleaseEntries(catalog.list, locale);
  try {
    const response = await fetch(RAW_CHARACTERS, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
    return projectHealthEntries(catalog.list, payload as Record<string, RawCharacter>, locale);
  } catch {
    return [];
  }
}
