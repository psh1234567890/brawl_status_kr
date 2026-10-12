# Account dashboard and saved-tag shortcuts

The signed-in/onboarded account page shows a read-only dashboard with:

- Saved public player profile summary: current/peak trophies, 3v3 victories,
  unlocked brawler count and icon. It uses the authenticated account's stored
  `default_player_tag`, **not** a client-supplied tag.
- Up to six private Mini Game personal bests and recent personal-best update
  timestamps from the **existing** account PB store (not raw played sessions).
- Server-verified, opt-in rank for Higher or Lower and Release Order for
  today in KST, trailing seven KST calendar dates, and all-time.
  Other four mini games have no verified competitive ranking.
- Up to five recent player-tag searches from **this browser's** existing
  `recentTags` localStorage key. No account-linked player search history or
  precise search timestamps are collected.

The private, rate-limited `GET /api/account/dashboard` requires an eligible,
onboarded, authenticated account and returns `Cache-Control: private, no-store`.
It selects the saved tag from the database and fetches its public Brawl API
profile via the already present upstream snapshot cache. This background
profile retrieval intentionally **does not** increment public search metrics
or reveal browsing/account identifiers. API failure affects only the player
card; the dashboard still displays existing cloud PBs and self-only ranks.

Ranking calculation uses the same KST periods and deterministic score/time/
anonymous-alias ordering as the existing public competitive rankings.
Results are selected only for the authenticated account ID, and other
users' aliases/IDs are never returned by this dashboard endpoint.
No schema change or new tracking cookies are required.

On the public home screen, eligible signed-in visitors with a valid saved
player tag see a one-click **search my saved tag** button. The click invokes
the exact same public search flow as a manual tag search, including the
normal public search analytics. Users without a saved tag or without an
account do not see the button. No automatic search runs on page load.

Account deletion, opt-out, local guest activity and private PB sync retain
their existing behavior. Both the account dashboard and the shortcut are
localized using the site's ten-locale message catalog.
