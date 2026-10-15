const BRAWLIFY_CDN_BASE_URL = "https://cdn.brawlify.com";

export function getPlayerIconUrl(iconId: number) {
  return `${BRAWLIFY_CDN_BASE_URL}/profile-icons/regular/${iconId}.png`;
}

/** Use the catalog's actual avatar ID; it is not derived from the brawler ID. */
export function getBrawlerPortraitSources(brawler: { id: number; imageUrl?: string; imageUrl2?: string; avatarId?: number }) {
  const avatarId = brawler.avatarId;
  return [...new Set([
    brawler.imageUrl2,
    brawler.imageUrl,
    typeof avatarId === "number" && Number.isSafeInteger(avatarId) && avatarId > 0 ? getPlayerIconUrl(avatarId) : undefined,
    `${BRAWLIFY_CDN_BASE_URL}/brawlers/borders/${brawler.id}.png`,
  ].filter((source): source is string => Boolean(source)))];
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
