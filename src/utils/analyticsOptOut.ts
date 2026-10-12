/** Shared explicit opt-out across anonymous usage and API performance analytics. */
export function isUsageOptedOut(request: Request): boolean {
  return /(?:^|;\s*)brawl_analytics_opt_out=1(?:;|$)/.test(request.headers.get("cookie") ?? "");
}
