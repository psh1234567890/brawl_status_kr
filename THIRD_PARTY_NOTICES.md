# Third-party notices

This file records third-party services and data sources. It is not a substitute for each provider's current terms.

| Source | Use in this project | Current status / action (checked 2026-09-22) |
| --- | --- | --- |
| Supercell / Brawl Stars API | Public player, battle, club, and ranking data | Follow the developer terms and Fan Content Policy; keep the required unofficial notice |
| Supercell assets | Game names used to identify and discuss the game; no bundled game-art icon | Excluded from the repository MIT License; keep runtime or remote assets under their provider's terms |
| BrawlAPI | Map, mode, brawler, and event metadata at runtime/build time; translation and skin-catalog source for `scripts/update-brawl-translations.mjs` | Current public docs describe a free static JSON API with no authentication or rate limit. Game data rights still remain subject to Supercell's terms/Fan Content Policy; no separate content-license grant was found on the API reference. |
| Brawlify CDN | Remote image CDN used for brawler, map, mode, profile, badge, ability, and gear images | The verified Brawlify GitHub CDN repository is MIT-licensed and explicitly permits direct linking, downloading, and programmatic fetch without Brawlify credit, while requiring compliance with Supercell's terms/Fan Content Policy. |
| Brawlace | Player-tag based owned-skin lookup | Privacy Policy was reviewed, but no explicit third-party automation/reuse/API permission was found on the public site. Runtime lookup is therefore disabled by default and requires `BRAWLACE_SKIN_LOOKUP_ENABLED=true` after operator review. |
| Jina Reader | Optional fallback reader when the direct Brawlace skin page cannot be parsed | Disabled by default. It runs only when both the Brawlace lookup and `BRAWLACE_JINA_READER_ENABLED=true` are enabled; an optional server-only API key is supported. Enabling it does not itself establish permission to reuse the target page, so the operator must review both Jina and target-site terms first. |
| RoyaleAPI proxy or another proxy | Optional, explicitly configured Brawl Stars API proxy | No code default; use only when deliberately configured and trusted because the server API key is sent to it |
| npm packages | Runtime and development dependencies | Each package remains under its own license; inspect `package-lock.json` and package notices for redistribution |

Brawlify CDN usage has an explicit public permission statement. BrawlAPI access behavior is documented publicly but underlying game-data rights remain governed by Supercell. Brawlace automated/reuse permission remains unresolved, so both Brawlace and Jina Reader runtime lookups are off by default and require explicit operator opt-in. See `docs/codex-for-oss/license-recommendation.md` for the project-level license boundary.
