# Automatic public game-tag search aggregates

## Scope and privacy
On successfully loading a player profile (`GET /api/player`) the production
server **automatically** increments a private hourly counter for the normalized
public game tag, recording the latest search time. No optional consent control.

The new `analytics_private.search_tag_hourly` table stores only
`hour_bucket`, `player_tag`, `search_count`, `last_searched_at`.
**Do not add requester IPs, accounts, sessions, cookies, User-Agent, referrers,
or device identifiers**. The request is consulted only to respect the existing
operator-browser `brawl_analytics_opt_out` cookie. Existing production rate
limiting and authentication continue to operate independently: this change
does not promise that the infrastructure never temporarily processes IPs.

Administrators see up to 40 latest searched tags with aggregate search counts
from approximately the last 7 days (hour buckets) and their last searched time,
but not the person who made the searches. A search does not establish ownership
of the searched game tag. The owner-only endpoint continues to require a
valid session plus the private admin allowlist.

`src/components/SearchTagNotice.tsx` replaces the checkbox with a concise
multilingual notice. The privacy policy describes purpose, fields, retention,
privacy questions, and opt-out/delete requests. Before treating a no-consent
processing model as legally compliant, the operator should check the relevant
personal-information processing basis for the particular service and audience.
Even public game tags may be personal information when relatable to people.

## Retention / legacy
Supabase migration `drizzle/0010_search_tag_hourly.sql` installs an hourly
`pg_cron` job `brawl-search-tag-expire-hourly` running at minute 11, deleting
only rows older than the hourly 7-day threshold. The owner-facing query never
includes expired buckets. Exact per-search timestamps are not stored; the
newest search timestamp is updated with each aggregate.

The previous `analytics_private.consented_search_details` table is no
longer read or written by the application. Its independent existing 7-day
cron job continues expiring historic opted-in rows; do not migrate its
IP or account fields into the new statistics. Legacy history is never backfilled.
Do not drop account or battle-related schemas as part of this rollout.

## Verification and safety
1. Migrate before merging code. Verify postgres's `anon` and `authenticated`
   roles cannot access the analytics schema/table.
2. Run full GitHub CI lint/unit/Next build/Playwright regression. The unit
   tests assert only a single tag appears in INSERT arguments and no visitor
   identity is persisted.
3. Merge and verify Vercel Production READY, public status, and an unauthenticated
   `/api/admin/usage` still returning 404. Test authorized results in a
   real signed-in session, never by bypassing auth.
4. No fabricated real visitor entries. Cron is considered operational after
   verifying an actual successful scheduled run, not just job registration.
