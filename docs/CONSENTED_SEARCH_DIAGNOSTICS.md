> **Legacy (discontinued with tag-only analytics rollout).** This document describes the
> previous optional consent-based diagnostic feature. The current implementation
> no longer collects or displays requester IP prefixes or signed-in account IDs
> alongside searched tags. See [SEARCH_TAG_ANALYTICS.md](./SEARCH_TAG_ANALYTICS.md).
> Historical detail rows, if any, remain in the isolated legacy table subject to
> the original seven-day expiration job and are not backfilled.

# Optional search diagnostics — privacy-first owner view

By default, existing visits/search events remain **anonymous hourly totals** and do not reveal the searched player tag, IP address or account identity.

When the visitor **actively selects the unchecked, optional checkbox** next to the search form, the browser adds the SameSite=Lax, HTTPS Secure (if applicable) `brawl_search_detail_consent=1` cookie, valid for a week. **Only subsequent successful player searches** can create an individual diagnostic row.

Each row: timestamp, normalized **public searched player tag**, heavily masked IPv4 /16 network or short IPv6 prefix (never full IP), and **optionally** the current signed-in account's server-verified UUID. The UUID is not client-supplied; when the admin views the list, the backend joins it to the current display nickname and sends a shortened ID (never email). **Searching a tag is not proof of ownership** of that Brawl Stars account. A player tag search by a guest will have no website account. The visitor can turn this off at any time with the same checkbox; previously recorded diagnostics remain until expiry, and can be removed on request.

Privacy restrictions:
- The user can search without giving consent; no functionality is withheld.
- `brawl_analytics_opt_out=1` overrides this optional consent.
- Do not store raw IPs, account email, OAuth subject, Google profile, sessions, cookies, query strings or any other identifying fields.
- Vercel Preview/local/test environments never insert diagnostic rows. The sole IP source is the verified `x-vercel-forwarded-for` header used by existing rate limits; user-supplied forwarded headers are never accepted.
- Diagnostics are in private unexposed Supabase schema `analytics_private`; both `anon` and `authenticated` DB roles lack privileges. Only an existing authenticated allowlisted site administrator can query `/api/admin/usage`, with `no-store` and `noindex`. No publicly queryable search-history endpoint.
- Only the latest **7 days** are returned and at most 40 entries. `drizzle/0009_hourly_expire_consented_search_details.sql` installs a Supabase `pg_cron` cleanup job at minute 7 of every hour, removing physical rows whose `searched_at` is older than 7 days, **even if no new searches occur**. A row may physically remain for up to roughly one additional hour between scheduled runs, but can never appear in the dashboard after its 7-day query cutoff. The existing deletion on successful opted-in writes remains defense in depth. No old raw server logs are backfilled; all counts begin after production rollout.
- Only the original hourly aggregate counters remain available when the visitor declines consent.
- Add clear notice to the site's privacy page in all supported locales and ensure the visitor can contact the operator to request earlier deletion. Before collecting any additional fields or extending retention, do a new privacy review.

Deployment and retention job:
1. `drizzle/0008_consented_search_details.sql` installs the already-deployed private table. `drizzle/0009_hourly_expire_consented_search_details.sql` enables Supabase `pg_cron` and schedules a named hourly cleanup. Only expired rows in that one table are deleted.
2. Check the job's exact name, cron expression, command and active flag in `cron.job`. Check scheduler execution via `cron.job_run_details` once its first scheduled run has occurred; a registered job does not prove it has executed.
3. The job is idempotently named; avoid adding a second duplicate job or public cleanup API. Rollback by unscheduling only `brawl-consented-search-details-expire-hourly` with `cron.unschedule` if the feature must be retired. Do not drop the globally shared `pg_cron` extension as it could erase other jobs.
4. Ensure CI (lint, unit, production build, browser E2E and account/deletion regressions) passes, merge and verify Production READY and existing routes.
5. Verify unauthorized dashboard access returns 404. A real signed-in owner browser must be used to verify authorized access; do not simulate visitors or add fake production search rows.
