# Private anonymous usage dashboard

## Scope and units

This opt-in administrator view distinguishes **browser-tab sessions** from real distinct people. A script in the shared Next.js layout sends one `visit_session` event per tab/session using `sessionStorage`. This is an estimate, not authenticated unique users; it can be affected by blocked JS, storage denial, bots or tabs. The event has **no IP address, tag, cookie identifier, fingerprint, account ID, URL or referrer stored** in the analytics table.

The existing `GET /api/player` server handler counts a valid profile fetch as `player_search_success` and upstream errors as `player_search_error`. Invalid input and rate-limited requests are not counted. This is a request count, not a count of people. Successful history saves are not a second search event.

Four minigame client components send one anonymous round-ending event when entering `finished`, including early endings; they do not submit scores, player IDs, prompts, or mode. Client POSTs require a same-origin Origin header, an allowlisted literal event name, a bounded JSON body and a per-process request rate limit. They remain best-effort and can be spoofed; **do not treat these counters as billing, security or fraud evidence**.

## Storage and retention

Migration `drizzle/0006_private_usage_hourly.sql` creates `analytics_private.usage_hourly` in a separate non-exposed PostgreSQL schema, revoking `anon` and `authenticated` schema/table privileges. Each row has only `hour_bucket`, `event_kind`, and `event_count`. Concurrent writes use an atomic upsert. Events are aggregated to UTC hours, rendered in KST, and rows older than 90 days are pruned on the next successful event write. The stats begin when instrumentation is deployed; old Vercel logs cannot be backfilled into visitor counts.

Analytics errors are sanitized and never block primary game/search functionality. Raw production IPs and request IDs remain in Vercel infrastructure's ordinary service logs under its independent policy, **not** this analytics table.

## Access control

`/admin/usage` is not linked from public navigation, has `noindex`, and reads from `/api/admin/usage`. The server verifies the Better Auth session and the existing account eligibility/pilot allowlist **first**, then checks the authenticated UUID in `analytics_private.usage_admin_allowlist`. This private table is created by `drizzle/0007_private_usage_admin_allowlist.sql`; no database privileges are granted to `anon` or `authenticated`. The existing `USAGE_ADMIN_USER_IDS` production environment variable remains an optional alternate admin allowlist for authorized environments, but **it is no longer required**. Missing DB and env entries both fail closed to 404. Reports have `private, no-store` and `noindex` headers.

Owner setup with the DB method (no Vercel env permission required):
1. Apply migrations 0006 (aggregate table) and 0007 (private administrator allowlist) using reviewed Supabase migrations.
2. Log in to the website with the owner's Google account, open `/api/account` in the same browser and copy only the owner's `account.id`. Never commit the actual account UUID to source code, tests or docs.
3. As an authorized database administrator, insert only that UUID into the protected table using a parameterized query or a reviewed SQL statement: `INSERT INTO analytics_private.usage_admin_allowlist (user_id) VALUES ('<approved-owner-uuid>'::uuid) ON CONFLICT (user_id) DO NOTHING;`. This is server-only configuration, not a public endpoint.
4. Deploy the reviewed application change and open `https://www.brawl-o1.site/admin/usage` while logged in. The checkbox lets the browser opt out of future visit/search/minigame counts by setting `brawl_analytics_opt_out=1` (SameSite cookie); disable the checkbox to resume counting.
5. Validate unauthorized requests return 404. Confirm authorized access in a real logged-in browser and watch the hourly aggregate and app logs. Never create fake production visitor counts in tests.

To revoke access, delete the matching UUID row from `analytics_private.usage_admin_allowlist`, and if applicable remove it from `USAGE_ADMIN_USER_IDS`. Privileges require the database owner, and access changes in the DB apply to the next API request without another deploy.

## Rollback

Rollback deployment to remove the trackers. Leave the harmless isolated aggregate table in place for investigation and later maintenance or remove it with separately reviewed migration once no app code uses it. No auth/account/battle table data or schema is changed by this feature.

## Tests

`src/server/usageAnalytics.test.ts`: strict literal event allowlist, KST aggregation and explicit admin allowlist. `src/app/api/usage/event/route.test.ts`: same-origin guard, event schema rejection and accepted event. `src/app/api/admin/usage/route.test.ts`: unauthenticated and non-admin responses deny without fetching analytics, valid admin no-store response. Full GitHub Actions tests/build/account regression must remain green.
