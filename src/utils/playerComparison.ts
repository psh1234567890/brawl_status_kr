import type { PlayerData } from "../types/brawl";
import { calculatePlayerProgression } from "./playerProgression";
import { isValidPlayerTag, normalizePlayerTag } from "./playerTag";

/** Shared URL validation: invalid or identical tags never trigger API calls. */
export function validatedComparisonTags(a: string, b: string) {
  const left = normalizePlayerTag(a);
  const right = normalizePlayerTag(b);
  if (!isValidPlayerTag(left) || !isValidPlayerTag(right)) return null;
  if (left === right) return null;
  return { left, right };
}

/** Allow a valid single-player prefill without making an incomplete VS request. */
export function comparisonPrefillTags(a: string, b: string) {
  const left = isValidPlayerTag(a) ? normalizePlayerTag(a) : "";
  const second = isValidPlayerTag(b) ? normalizePlayerTag(b) : "";
  return { left, right: second !== left ? second : "" };
}

export function comparisonPath(pathname: string, left: string, right: string) {
  const tags = validatedComparisonTags(left, right);
  if (!tags) return pathname;
  const params = new URLSearchParams({ a: tags.left, b: tags.right });
  return pathname + "?" + params.toString();
}

export function summarizeComparedPlayer(player: PlayerData) {
  const owned = player.brawlers ?? [];
  const progression = calculatePlayerProgression(owned);
  const topBrawlers = [...owned]
    .filter((b) => Number.isFinite(b.trophies) && b.trophies >= 0)
    .sort((a, b) => b.trophies - a.trophies || a.id - b.id)
    .slice(0, 5)
    .map(({ id, name, trophies, power }) => ({ id, name, trophies, power }));
  return {
    trophies: player.trophies,
    highestTrophies: player.highestTrophies,
    victories3v3: player["3vs3Victories"],
    soloVictories: player.soloVictories,
    duoVictories: player.duoVictories,
    brawlers: progression.ownedBrawlers,
    power11: progression.power11,
    upgradePercent: progression.percent,
    upgradesCoins: progression.coins,
    gadgets: progression.gadgets,
    starPowers: progression.starPowers,
    hyperCharges: progression.hyperCharges,
    topBrawlers,
  };
}

/** Winner indicators apply only to directly comparable numeric fields. */
export function higherValueSide(a: number | null, b: number | null): "a" | "b" | null {
  if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
  return a > b ? "a" : "b";
}
