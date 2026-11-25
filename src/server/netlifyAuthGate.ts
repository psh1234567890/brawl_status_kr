/** Fail closed in Netlify Functions unless both build and runtime approved release. */
export function canUseNetlifyAccountFlows(env: Record<string, string | undefined>): boolean {
  const onNetlify = Boolean(env.SITE_ID) || env.BRAWLOOP_NETLIFY_PRODUCTION === "1";
  if (!onNetlify) return true;
  return Boolean(env.SITE_ID?.trim()) &&
    env.BRAWLOOP_NETLIFY_PRODUCTION === "1" &&
    env.NEXT_PUBLIC_BRAWLOOP_STAGING === "0" &&
    env.BRAWLOOP_NETLIFY_RELEASE_APPROVED === "1";
}
