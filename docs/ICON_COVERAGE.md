# Game artwork and UI-symbol coverage

This change complements the existing official in-game league imagery PR #82.

## Confirmed artwork from the Brawlify CDN

- Site uses Brawlify Brawler portraits, player profile icons, club badges,
  game maps, gadgets, star powers, gears, mode artwork and ranked league art.
- Mode mapping in src/utils/gameModeIcons.ts is a static **allowlist** obtained
  from BrawlAPI /v1/gamemodes (names, scHash, exact numeric image IDs).
  Every ID was cross-checked against an actual image file under Brawlify CDN's
  game-modes/regular directory. Names are normalized case-insensitively,
  unrelated text and unsafe filenames cannot become image URLs.
- Show mode emblems on recent battles, battle detail modal, history best mode
  and popular modes, map cards and current/upcoming map rotations.
- Show existing verified Brawler portraits in the counter-recommendation and
  team-meta recommendations, using the Brawler catalog's ID map only.
- The existing gadget, star power, gear, club badge, player avatar, ranked
  and map images are not duplicated by generic replacements.

## Generic interface icons (not official game graphics)

Where the game artwork is available and semantically exact, prefer it: all
current and highest trophy counts show the classic gold in-game trophy PNG;
currency coin amounts use the in-game coin icon; solo showdown and duo showdown
victories show the correct separate Brawlify game-mode icon (48000006 versus
48000009). Robo Rumble and Big Game records also use their real mode artwork.
Other stats such as wins across all 3v3 modes, time, level, equipment category
counts and history use small generic SVGs alongside their existing localized
labels. Never pass a generic UI icon off as official in-game art.

## Important fallback

Brawlify CDN still has **no hypercharges directory**. Instead we use
BSInfo CDN, which publishes /hypercharges/{abilityId}.png. The static
src/utils/hyperchargeImages.ts allowlist contains 107 numeric IDs directly
cross-checked with its actual published image listing on 2026-10-12.
Recognized hypercharge IDs render the correct in-game ability image alongside
its translated ability name, just like gadgets and star powers. Unknown IDs
or images that fail to load gracefully fall back to the generic lightning
symbol instead of sending speculative image requests. This is important
because new game updates may add IDs ahead of the CDN.

The gold trophy icon and coin icon were confirmed visually from the fan-made
Brawl Stars asset collection at
https://github.com/raharisonAina/BrawlStars/tree/main/assets and are bundled
locally under /public/game-assets. They do not add a network dependency.
Game-mode and equipment art comes from community CDNs, subject
to their availability and third-party fan content conditions. Site identity
remains our own logo and the existing unofficial-fan-content disclaimer.
No backend data collection or account/database mutation was added.

References:
- https://github.com/Brawlify/CDN
- https://github.com/lot-xq/BSInfo-CDN
- https://brawlapi-v1.pages.dev/v1/gamemodes
- https://supercell.com/en/fan-content-policy/
