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

Use consistent small SVG symbols adjacent to the **existing numeric values
and localized labels** for trophies, highest trophies, wins, time, player
level, skins, power, equipment types, ranks, rarities, battles, map links and
history. These UI symbols are intentionally not represented as game assets.
Unknown data receives text, not a made-up game icon.

## Important fallback

At implementation time Brawlify CDN had **no hypercharges directory**,
despite prior code trying to load its /hypercharges/regular/{id}.png URLs.
Owned hypercharge names continue to be displayed, but now use a local generic
hypercharge-category icon instead of making broken remote requests.
All remote game imagery retains the existing BrawlImage onError fallback.

Official game imagery is fetched from a third-party community CDN subject
to its availability and third-party fan content conditions. Site identity
remains our own logo and the existing unofficial-fan-content disclaimer.
No backend data collection or account/database mutation was added.

References:
- https://github.com/Brawlify/CDN
- https://brawlapi-v1.pages.dev/v1/gamemodes
- https://supercell.com/en/fan-content-policy/
