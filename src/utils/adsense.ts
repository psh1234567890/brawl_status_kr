const ADSENSE_CLIENT_ID_PATTERN = /^ca-(pub-\d{16})$/;

export function getAdsensePublisherId(clientId: string | undefined) {
  if (!clientId) return null;
  return ADSENSE_CLIENT_ID_PATTERN.exec(clientId.trim())?.[1] ?? null;
}

export function buildAdsTxtLine(clientId: string | undefined) {
  const publisherId = getAdsensePublisherId(clientId);
  return publisherId
    ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0`
    : null;
}
