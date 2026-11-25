import "server-only";

export function isProductionDeployment() {
  return process.env.VERCEL_ENV === "production" || process.env.BRAWLOOP_NETLIFY_PRODUCTION === "1";
}
