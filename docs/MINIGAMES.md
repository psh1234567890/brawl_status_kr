# Mini Games

Mini Games are registered in `src/utils/minigames/registry.ts`. The hub reads
that registry, and localized routes use the existing `/minigames/...` route
convention. The playable games use Brawlify catalog data projected on the
server into small serializable records. No player identity or server-side score
is stored.

Six games are playable: Brawler Name Quiz, base-brawler Silhouette Quiz, Map
Name Quiz, Gadget / Star Power Owner Quiz, Higher or Lower (base HP) and
Release Order (curated historical brawler public debut dates). Skin silhouette
modes remain disabled because the current generated skin catalog contains
no suitable render URLs.

## Asset source and release review

Silhouette artwork uses only `brawlers/model/{id}.png` paths listed in the
generated manifest from [Brawlify/CDN](https://github.com/Brawlify/CDN). Refresh
the provenance and path manifest with `npm run minigames:assets:update`; the
script downloads no image files. A listed or publicly reachable CDN image does
not establish permission to publish it. Before public release, the reviewer
must check the current [Supercell Fan Content Policy](https://supercell.com/en/fan-content-policy/)
and resolve whether the selected game name, logos, and character artwork are
permitted. This implementation does not claim to be an official Supercell game.

## Future game contracts

- **Skin silhouette modes:** require suitable, permission-cleared skin render
  images and a stable skin-to-owner mapping. `isCatalogReleased` is catalog
  visibility, not proof of a skin's first public release. Keep this independent
  from base-brawler model IDs.
## Comparison game data contracts

- **Higher or Lower:** server loads `csv_logic/characters` from
  [BrawlAPI's game-file mirror](https://brawlapi.com/) with a 24-hour
  revalidation window. Only released Brawlify catalog heroes that have an
  exactly matching raw numeric ID, `Type=Hero`, `Disabled=false` and an
  integral, positive `Hitpoints` value are used. This is **unscaled base HP**
  before gear/buffs, not a claim about each character's level-11 battle HP.
  If upstream data is unavailable, the game disables its Start button; it
  never invents HP values. Revalidate the mirror after game updates.
- **Release Order:** this is a **curated subset** of published first public
  debut dates taken from
  [Liquipedia's community chronology](https://liquipedia.net/brawlstars/Module:BrawlerReleaseDates),
  reviewed against the current Brawlify catalog. This is **not** an official
  Supercell release calendar and not complete for all brawlers. Game IDs,
  Brawlify order and database insertion timestamps are **never** used to infer
  release order. Unlisted brawlers and same-date pairs are excluded. Updates
  to the chronology require manual source review.
- Both run 10 independent, non-repeating comparisons. Tie questions are
  excluded; incomplete rounds do not save a personal best. Guest best records
  use isolated localStorage keys (not the original four games' keys).
  **Cloud PB synchronization and public rankings are not enabled** for the
  new games until the account slots and competitive scoring validation have
  separate release/migration coverage.

## Test data

Local and CI gameplay tests can use deterministic fixture catalogs by setting
`MINIGAMES_E2E_FIXTURES=1` on the server process. The server rejects this flag
when `VERCEL` is set. The flag is not read by client code and is not accepted
from routes, cookies, or query parameters. Fixture records are test-only and
must not be used as production catalog data.

## Optional account personal-best sync

Guest gameplay and its original localStorage keys remain the source of the
existing browser experience. Signed-in users can separately sync eleven private
PB slots: Brawler Quiz (`3m`, `5m`, `10m`, `practice`), Silhouette (`base`),
Map Quiz (`standard`), Ability Quiz (`mixed`, `gadget`, `star-power`),
Higher or Lower (`standard`), and Release Order (`standard`). The
server accepts only these game/mode pairs; non-Brawler games require exactly
10 completed questions. Silhouette's local key name is mapped to the canonical
`silhouette-quiz` ID.

Cloud rows are client-reported, unverified personal bests. They have no elapsed
time and are never leaderboard input. Brawler Quiz compares exact score ratios
by cross multiplication, then prefers the larger raw score for equal ratios.
The other games compare score out of ten. Exact ties leave the first cloud row
and its revision/timestamps unchanged. A stale local candidate cannot lower a
cloud PB.

The six existing localStorage keys are read only after the user chooses
“Import this browser's personal bests.” Parsing is strict, percentages are
recomputed, invalid dates become null, and the original keys are not deleted.
The selected snapshot and operation UUID are stored in the account-scoped
IndexedDB outbox before sending. Retries reuse the same operation UUID and
payload; the database receipt and PB upserts commit in one transaction. Queue
ownership stays with the user captured at round start, even after logout or an
account switch. Browser cache and queue values are convenience state, never
authorization evidence.

Do not promote these rows into overall or weekly rankings. Competitive modes
need separate immutable rulesets/question sets, server-issued play sessions,
server-side answer validation, replay protection, and finalized server-derived
results as described in the account roadmap.

## Server-verified comparison leaderboards (ruleset v1)

Higher or Lower and Release Order offer a separate optional ranked mode,
available only to signed-in and onboarded accounts with sync enabled.
The private guest PBs and the other four minigames are excluded.

- A ranked player explicitly opts in to a random `Player-XXXXXXXXXX` alias,
  **not** an account nickname, game tag, e-mail, or IP.
- Start creates a server-owned, 20-minute, 10-question challenge from the
  current verified source data. Only the current pair's IDs, public names
  and artwork are shown; correct answer and values remain server-side until
  the player submits that answer.
- The server checks chosen IDs and advances one locked database row. Skipped,
  duplicate, expired, and wrong-account answers are rejected. Final scores
  are computed by the server and can never be supplied by the browser.
- Daily means today in KST, weekly means today's KST date plus the preceding
  six dates, and all-time includes all verified completed rounds since launch.
  Ranking shows each account's best in that interval, with earlier completion
  breaking ties; maximum 50 random aliases per game.
- Withdrawal deletes all verified results, alias and unfinished rounds but
  **never** affects private PBs. Account deletion cascades to all tables.
- Unfinished challenges expire in 20 minutes and are physically purged by
  the Supabase-only `0018` hourly job. Completed results last until
  withdrawal/account deletion to support an honest all-time leaderboard.
- This blocks arbitrary forged scores; it cannot prevent consulting publicly
  available game stats/dates or sophisticated automation. No prizes.
- All three tables are in the encrypted account-only snapshot allowlist and
  must pass isolated backup/restore/deletion tests before production launch.
- Operators can set `COMPETITIVE_RANKINGS_ENABLED=0` to pause new starts and
  answers without affecting practice/cloud PB synchronization; withdrawals
  and public viewing remain available. The default is enabled only if account
  sync and account eligibility have already been enabled.
