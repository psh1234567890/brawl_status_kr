const BRAWLIFY_CDN_BASE_URL = "https://cdn.brawlify.com";

export function getPlayerIconUrl(iconId: number) {
  return `${BRAWLIFY_CDN_BASE_URL}/profile-icons/regular/${iconId}.png`;
}

export function getClubBadgeUrl(badgeId: number) {
  return `${BRAWLIFY_CDN_BASE_URL}/club-badges/regular/${badgeId}.png`;
}
