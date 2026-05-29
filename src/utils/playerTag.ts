export function normalizePlayerTag(tag: string) {
  return tag.trim().replace(/^#/, "").toUpperCase();
}

export function isValidPlayerTag(tag: string) {
  return /^[0289PYLQGRJCUV]{3,15}$/.test(normalizePlayerTag(tag));
}
