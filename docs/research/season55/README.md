# Season 55 composition recommendations

The Korean `/meta/draft` page recommends the final team member from the map, two teammates, and three opponents. It supports bans and an explicit candidate list. The existing `/meta` page links to this feature and retains its live scoring behavior.

The server runs the fitted L2 logistic regression exported from the school Colab project. It preserves feature definitions, within-team sorting, and paired team-swap inference. The 1.65 MB JSON artifact contains coefficients and aggregate training counts, with no player tags. No Python process, model retraining, or database is required at inference time.

## Data and scope

- Source: [EliF77/brawlstars-ranked](https://huggingface.co/datasets/EliF77/brawlstars-ranked), revision `e5c999f1234d36700c43143e01089ce3bf5e61ea`.
- Season 55 complete ranked sets, all six players at power 11. Training: 2,695,474 sets ending 2026-10-26 07:50:07 UTC.
- 107 known brawlers, 32 training map/mode pairs, 30,621 features. Unsupported inputs return a validation error.
- The comparison panel computes `legacy-v1` map scores on the **same training cohort**, using the helper shared with `/api/meta`. The live endpoint continues to use its current database snapshot.
- Score: `floor(floor(100 * wins / plays) * plays / (plays + 5))`, at least five appearances. Ties use plays, floored win rate, and name.

## Reproduce the ranking comparison

`context_sample.csv` retains 130 previously selected validation contexts (five for each of 26 observed map/mode pairs), plus the original illustration marked false. The five already selected brawlers are excluded identically for both methods. No outcomes enter this comparison and no parameters change.

Set `FOLLOWUP_BASE_URL` to `https://raw.githubusercontent.com/psh1234567890/brawl_status_kr/<full-commit-sha>` before running `reproduce_comparison.py` in Colab. The calculation requires only the Python standard library and downloads the pinned model artifact and context sample. It saves a summary and per-context CSV.

Results: 43/130 equal top recommendations (33.08%); mean overlap of 0.9846 in the top three and 1.8231 in the top five. In 104 adjacent within-map context pairs, restricted to their common candidates, the composition model changes its first recommendation in 91 pairs (87.50%). These quantify ranking differences and sensitivity to team inputs. Player outcome effects require a subsequent play experiment.

## Verification

The TypeScript implementation matched 13,362 saved Python probabilities across 131 contexts within 3.34e-16. Team-slot order invariance and team-swap complementarity were checked across that set. A warm in-process benchmark of 655 calls (102 candidates each) averaged 2.61 ms on a Ryzen 5 7500F with Node 24.18.0; it excludes network, cold loading, and UI time.

`npm test`, `npm run lint`, and `npm run build` pass. Browser verification covers desktop 1366x1000, mobile 390x844, composition changes, stale-result clearing, bans, candidate restrictions, and invalid requests. Production deployment is separate from these local checks.
