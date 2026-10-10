# Private anonymous usage dashboard

## Scope and units

This opt-in administrator view distinguishes **browser-tab sessions** from real distinct people. A script in the shared Next.js layout sends one `visit_session` event per tab/session using `sessionStorage`. This is an estimate, not authenticated unique users; it can be affected by blocked JS, storage denial, bots or tabs. The event has **no IP address, tag, cookie identifier, fingerprint, account ID, URL or referrer stored** in the analytics table.

The existing `GET /api/player` server handler counts a valid profile fetch as `player_search_success` and upstream errors as `player_search_error`. Invalid input and rate-limited requests are not counted. This is a request count, not a count of people. Successful history saves are not a second search event.

Four minigame client components send one anonymous round-ending event when entering `finished`, including early endings; they do not submit scores, player IDs, prompts, or mode. Client POSTs require a same-origin Origin header, an allowlisted literal event name, a bounded JSON body and a per-process request rate limit. They remain best-effort and can be spoofed; **do not treat these counters as billing, security or fraud evidence**.

## Storage and retention

Migration `drizzle/0006_private_usage_hourly.sql` creates `analytics_private.usage_hourly` in a separate non-exposed PostgreSQL schema, revoking `anon` and `authenticated` schema/table privileges. Each row has only `hour_bucket`, `event_kind`, and `event_count`. Concurrent writes use an atomic upsert. Events are aggregated to UTC hours, rendered in KST, and rows older than 90 days are pruned on the next successful event write. The stats begin when instrumentation is deployed; old Vercel logs cannot be backfilled into visitor counts.

Analytics errors are sanitized and never block primary game/search functionality. Raw production IPs and request IDs remain in Vercel infrastructure's ordinary service logs under its independent policy, **not** this analytics table.

## Access control

`/admin/usage` is not linked in public navigation, has `noindex`, and fetches from `/api/admin/usage`. The API **fails closed** with 404 until `USAGE_ADMIN_USER_IDS` is configured. When configured, the server verifies the Better Auth session via the existing account policy, then matches its user UUID against the exact comma-separated allowlist; it returns no metrics to any other visitor. The response is private, no-store and noindex. Never use a public API key or the player's game tag to grant admin access.

To activate:
1. Deploy migration 0006 using a reviewed Supabase migration (no existing tables changed).
2. Log in with your own Google account, visit `/api/account` in that same browser and read your **own** `account.id` when `state=account` (do not share it publicly).
3. In the Vercel project's production environment variables, set `USAGE_ADMIN_USER_IDS` to your UUID (or a comma-separated list of explicitly authorized UUIDs). Redeploy once for the function environment to include it. Missing/empty means all access denied.
4. Go to `https://www.brawl-o1.site/admin/usage` while signed in. Use the checkbox to opt this **browser** out of counting (client `brawl_analytics_opt_out=1` same-site cookie). This excludes future visit/search/game events in this browser; clear via the same checkbox to resume.
5. Monitor `usage_counter_unavailable` logs and test with a separate browser that you explicitly opted in. Do not simulate fake "real visitors" in production.

## Rollback

Rollback deployment to remove the trackers. Leave the harmless isolated aggregate table in place for investigation and later maintenance or remove it with separately reviewed migration once no app code uses it. No auth/account/battle table data or schema is changed by this feature.

## Tests

`src/server/usageAnalytics.test.ts`: strict literal event allowlist, KST aggregation and explicit admin allowlist. `src/app/api/usage/event/route.test.ts`: same-origin guard, event schema rejection and accepted event. `src/app/api/admin/usage/route.test.ts`: unauthenticated and non-admin responses deny without fetching analytics, valid admin no-store response. Full GitHub Actions tests/build/account regression must remain green.
