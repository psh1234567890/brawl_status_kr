import type { Brawler } from "../types/brawl";

// Fixed Power 1–11 upgrade costs as of October 2026.
// These exclude brawler unlocks, gadgets, Star Powers, gears, Hypercharges
// and Buffies. Review after game economy changes.
// Reference: https://brawls.wiki/upgrade-calculator/
const COIN_COST = [0, 0, 20, 35, 75, 140, 290, 480, 800, 1250, 1875, 2800];
const POINT_COST = [0, 0, 20, 30, 50, 80, 130, 210, 340, 550, 890, 1440];
export const MAX_POWER = 11;
export const FULL_POWER_COINS = 7765;
export const FULL_POWER_POINTS = 3740;

function sumAfter(level: number, values: number[]) {
  return values.slice(level + 1).reduce((sum, cost) => sum + cost, 0);
}

export function calculatePlayerProgression(brawlers: Brawler[]) {
  const seen = new Set<number>();
  const upgrades: { id: number; name: string; power: number; coins: number; powerPoints: number }[] = [];
  let unknownLevels = 0;
  let gadgets = 0;
  let starPowers = 0;
  let hyperCharges = 0;
  for (const brawler of brawlers) {
    if (!Number.isSafeInteger(brawler.id) || seen.has(brawler.id)) continue;
    seen.add(brawler.id);
    if (!Number.isSafeInteger(brawler.power) || brawler.power < 1 || brawler.power > MAX_POWER) {
      unknownLevels++;
      continue;
    }
    upgrades.push({
      id: brawler.id,
      name: brawler.name,
      power: brawler.power,
      coins: sumAfter(brawler.power, COIN_COST),
      powerPoints: sumAfter(brawler.power, POINT_COST),
    });
    gadgets += brawler.gadgets?.length ?? 0;
    starPowers += brawler.starPowers?.length ?? 0;
    hyperCharges += brawler.hyperCharges?.length ?? 0;
  }
  const remainingCoins = upgrades.reduce((sum, x) => sum + x.coins, 0);
  const remainingPoints = upgrades.reduce((sum, x) => sum + x.powerPoints, 0);
  const denominator = upgrades.length * FULL_POWER_COINS;
  return {
    ownedBrawlers: seen.size,
    measuredBrawlers: upgrades.length,
    unknownLevels,
    power11: upgrades.filter((x) => x.power === 11).length,
    coins: remainingCoins,
    powerPoints: remainingPoints,
    // Share of the FIXED level-up coin cost already covered, for currently owned Brawlers.
    // This does not claim an account-wide max completion percentage.
    percent: denominator ? Math.round((1 - remainingCoins / denominator) * 1000) / 10 : null,
    gadgets,
    starPowers,
    hyperCharges,
    upgrades: upgrades.sort((a, b) => b.coins - a.coins || a.name.localeCompare(b.name)),
  };
}
