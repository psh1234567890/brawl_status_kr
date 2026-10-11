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
- Only the latest **7 days** are returned and at most 40 entries. Rows older than 7 days are deleted on the next opted-in search write. No old raw server logs are backfilled; all counts begin after production rollout.
- Only the original hourly aggregate counters remain available when the visitor declines consent.
- Add clear notice to the site's privacy page in all supported locales and ensure the visitor can contact the operator to request earlier deletion. Before collecting any additional fields or extending retention, do a new privacy review.

Deployment:
1. Land and verify the code and consent notices.
2. Apply `drizzle/0008_consented_search_details.sql` to the Supabase project **before** merging so deployed queries never fail; it creates only the new table and index.
3. Ensure CI (lint, unit security tests, production build, browser E2E, account/deletion regressions) passes, merge PR and verify production READY and existing routes.
4. Validate a non-logged-in browser gets 404 from `/api/admin/usage`. Authorized details need the user's real session; do not bypass auth to simulate a person.
5. Do not create artificial production entries. Verify counts via existing authorized traffic after consenting on a test browser.
