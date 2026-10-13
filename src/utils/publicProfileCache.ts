import { isValidPlayerTag, normalizePlayerTag } from "./playerTag";

export const PROFILE_CACHE_KEY = "brawl_public_profiles_v1";
export const PROFILE_CACHE_EVENT = "publicProfilesChanged";
const MAX_AGE = 30 * 86_400_000;
export type CachedPublicProfile = {
  tag: string; name: string; trophies: number; checkedAt: number;
  previousTrophies?: number;
};
export function parsePublicProfiles(raw: string, now = Date.now()): CachedPublicProfile[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const result: CachedPublicProfile[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const tag = typeof item.tag === "string" ? normalizePlayerTag(item.tag) : "";
      if (!isValidPlayerTag(tag) || seen.has(tag) || typeof item.name !== "string" ||
          !Number.isSafeInteger(item.trophies) || item.trophies < 0 ||
          !Number.isFinite(item.checkedAt) || item.checkedAt > now || now - item.checkedAt > MAX_AGE) continue;
      seen.add(tag);
      result.push({ tag, name: item.name.slice(0, 64), trophies: item.trophies, checkedAt: item.checkedAt,
        ...(Number.isSafeInteger(item.previousTrophies) && item.previousTrophies >= 0
          ? { previousTrophies: item.previousTrophies } : {}) });
      if (result.length === 12) break;
    }
    return result;
  } catch { return []; }
}
export function publicProfileSnapshot(): string {
  try { return localStorage.getItem(PROFILE_CACHE_KEY) ?? "[]"; }
  catch { return "[]"; }
}
export function subscribePublicProfiles(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(PROFILE_CACHE_EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(PROFILE_CACHE_EVENT, notify);
  };
}
export function rememberPublicProfile(player: { tag: string; name: string; trophies: number }, now = Date.now()) {
  try {
    const tag = normalizePlayerTag(player.tag);
    if (!isValidPlayerTag(tag) || !Number.isSafeInteger(player.trophies) || player.trophies < 0) return;
    const profiles = parsePublicProfiles(publicProfileSnapshot(), now);
    const previous = profiles.find(item => item.tag === tag);
    // Strict Mode or duplicate responses must not erase the comparison baseline.
    if (previous && previous.trophies === player.trophies && previous.name === player.name && now - previous.checkedAt < 30_000) return;
    const next: CachedPublicProfile = { tag, name: player.name.slice(0, 64), trophies: player.trophies, checkedAt: now,
      ...(previous ? { previousTrophies: previous.trophies } : {}) };
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify([next, ...profiles.filter(item => item.tag !== tag)].slice(0, 12)));
    window.dispatchEvent(new Event(PROFILE_CACHE_EVENT));
  } catch { /* Browser storage is optional; search must continue. */ }
}
