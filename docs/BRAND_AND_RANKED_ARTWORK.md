# Site brand and in-game league icon usage

- Both public home pages (Korean and localized) and all portal pages display
  our own /icon.svg Brawl Status KR mark beside the site title. This artwork
  already existed as the site's favicon and is not the Supercell or Brawl Stars
  logo. Do not replace it with an official game logo or imply affiliation.
- When a current or all-time highest ranked league is returned by the Brawl
  Stars player API, show its in-game emblem in the player profile, retaining
  the exact division name (e.g. Mythic II) and Elo text next to it. Apply the
  same display rules to the signed-in account's saved-tag dashboard.
- League emblems are hotlinked from the Brawlify community CDN's ranked/regular/
  asset family (Bronze, Silver, Gold, Diamond, Mythic, Legendary, Masters, Pro).
  Brawlify provides the actual game images and allows third-party hotlinking.
- Map only explicit API league names recognized in rankDict, not arbitrary
  text, numeric Elo thresholds, or user-submitted values. Division suffixes
  I/II/III remain text, not fabricated artwork or assumed tiered image IDs.
  If a rank is unknown or missing, the text stays readable.
- Brawler pictures, gadget/star power icons, map art, player thumbnails
  and club badges already use established Brawlify URLs across the site.
  Do not add duplicate or mismatched decorative game assets.
- The CDN remains an external dependency. Assets render as unoptimized Next
  images to avoid extra server image transformation quotas. Image CSP already
  allows cdn.brawlify.com. Rank artwork is decorative with adjacent rank text.

Source references:
- https://github.com/Brawlify/CDN/blob/master/ranked/README.md
- https://github.com/Brawlify/CDN
- https://supercell.com/en/fan-content-policy/

No analytics, schema, account data or permission changes are required.
