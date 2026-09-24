# Mini Games

Mini Games are registered in `src/utils/minigames/registry.ts`. The hub reads
that registry, and localized routes use the existing `/minigames/...` route
convention. The playable games use Brawlify catalog data projected on the
server into small serializable records. No player identity or server-side score
is stored.

The current games are the Brawler Name Quiz, base-brawler Silhouette Quiz, Map
Name Quiz, and Gadget / Star Power Owner Quiz. Higher or Lower and Release Order
remain informational pages until reliable data is available. Skin silhouette
modes also remain disabled because the current generated skin catalog contains
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
- **Higher or Lower:** require a current, verified primary-source stat dataset,
  metric definitions, and update provenance. Do not use the stale raw snapshot
  or infer values from a different game API.
- **Release Order:** require a complete, verified primary-source timeline and a
  documented definition of release (for example, global game release versus a
  regional or early-access date). Do not infer dates from IDs or catalog order.

## Test data

Local and CI gameplay tests can use deterministic fixture catalogs by setting
`MINIGAMES_E2E_FIXTURES=1` on the server process. The server rejects this flag
when `VERCEL` is set. The flag is not read by client code and is not accepted
from routes, cookies, or query parameters. Fixture records are test-only and
must not be used as production catalog data.
