const BRAWLIFY_CDN_BASE_URL = "https://cdn.brawlify.com";

export function getPlayerIconUrl(iconId: number) {
  return `${BRAWLIFY_CDN_BASE_URL}/profile-icons/regular/${iconId}.png`;
}

export function getClubBadgeUrl(badgeId: number) {
  return `${BRAWLIFY_CDN_BASE_URL}/club-badges/regular/${badgeId}.png`;
}

/** Brawlify's in-game ranked icons are keyed by league name, not Elo.
 * Only use a confirmed game league; don't infer a rank from an Elo value. */
const RANKED_LEAGUE_NAMES = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  DIAMOND: "Diamond",
  MYTHIC: "Mythic",
  LEGENDARY: "Legendary",
  MASTERS: "Masters",
  PRO: "Pro",
} as const;

export function getRankedLeagueIconUrl(rankName?: string | null): string | null {
  if (typeof rankName !== "string") return null;
  const normalized = rankName.trim().toUpperCase().replace(/\s+/g, " ");
  const match = /^(BRONZE|SILVER|GOLD|DIAMOND|MYTHIC|LEGENDARY|MASTERS)(?: (I|II|III))?$|^(PRO)$/.exec(normalized);
  if (!match) return null;
  const league = (match[1] ?? match[3]) as keyof typeof RANKED_LEAGUE_NAMES;
  return `${BRAWLIFY_CDN_BASE_URL}/ranked/regular/${RANKED_LEAGUE_NAMES[league]}.png`;
}
