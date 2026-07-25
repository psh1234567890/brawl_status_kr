# Third-party notices

This file records third-party services and data sources. It is not a substitute for each provider's current terms.

| Source | Use in this project | Current action |
| --- | --- | --- |
| Supercell / Brawl Stars API | Public player, battle, club, and ranking data | Follow the developer terms and Fan Content Policy; keep the required unofficial notice |
| Supercell assets | Game names used to identify and discuss the game; no bundled game-art icon | Excluded from the repository MIT License; keep runtime or remote assets under their provider's terms |
| BrawlAPI | Translation and skin-catalog source used by `scripts/update-brawl-translations.mjs` | Confirm the upstream data/license terms and record the exact version or retrieval date |
| Brawlify | Map, mode, brawler, and event metadata fetched at runtime/build time | Follow the provider's API terms and preserve source attribution where required |
| RoyaleAPI proxy or another proxy | Optional, explicitly configured Brawl Stars API proxy | No code default; use only when deliberately configured and trusted because the server API key is sent to it |
| npm packages | Runtime and development dependencies | Each package remains under its own license; inspect `package-lock.json` and package notices for redistribution |

BrawlAPI and Brawlify terms still require verification before `v0.1.0`; see `docs/codex-for-oss/license-recommendation.md`.
