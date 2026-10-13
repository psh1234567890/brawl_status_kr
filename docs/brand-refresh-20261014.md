# Brawloop brand refresh

The owner selected **Brawloop (브롤루프)** on 2026-10-14 and requested a clear, playful game brand.

## Implemented

- Shared Brawloop wordmark, compact navigation, footer, favicon, page titles, structured data, quiz sharing text, and social image.
- Yellow player-search hero, purple quiz feature, Brawler artwork, two secondary games, player comparison, and catalog links on the home page.
- Recent searches and favorites appear when populated. The tag help and collection limitation are collapsed under the search field.
- Three primary destinations remain visible on desktop; all existing destinations and language switching remain in the menu. Mobile account access uses an accessible icon.
- A flat profile summary and illustrated six-game catalog use the same color and type system. Game rules and detailed statistical panels remain functionally unchanged.
- New home copy in all ten supported languages. Pretendard and Lilita One are self-hosted, with license files under `public/fonts/brand`.

## Boundaries

- The domain, canonical paths, locale routes, public API behavior, localStorage keys, session/cookie settings, account policies, and analytics event schema remain unchanged.
- The original checkout and its uncommitted account work were not edited. Implementation is on `codex/brand-refresh-20261014` in the existing isolated worktree.
- `/brand-preview` is a design reference, available only with `BRAND_PREVIEW_ENABLED=1`, and is marked noindex. Its sample profile is explicitly fictional; saved state there is demonstration-only.
- No new domain was registered. Name selection is a product decision, not a claim of trademark or domain availability.

## Local validation

- TypeScript and ESLint pass.
- Production build passes with the existing `MINIGAMES_E2E_FIXTURES=1` setting and no production secrets.
- Unit suite: 328 passed; 13 database-dependent tests skipped locally.
- Browser checks cover the actual home and game catalog, invalid search, language switching, and 320/390 px layouts; the design reference also exercises profile tabs, save state, and game filters.
- Existing E2E expectations were updated for the wordmark, new home game link, and brand metadata. Remote CI remains the authority for mocked player/account flows.
