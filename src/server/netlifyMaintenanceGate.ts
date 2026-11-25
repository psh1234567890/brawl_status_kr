/**
 * Scheduled Netlify Functions are not compiled by Next.js. Require explicit
 * Functions-scoped release approval as well as the production/staging flags.
 */
export function canRunNetlifyAccountMaintenance(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.SITE_ID?.trim()) &&
    env.BRAWLOOP_NETLIFY_RELEASE_APPROVED === "1" &&
    env.BRAWLOOP_NETLIFY_PRODUCTION === "1" &&
    env.NEXT_PUBLIC_BRAWLOOP_STAGING === "0" &&
    env.NETLIFY_ACCOUNT_MAINTENANCE === "1";
}
