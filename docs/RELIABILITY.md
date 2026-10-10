# Public API and data-status reliability

## Player lookup

`src/server/upstream.ts` coalesces concurrent requests and keeps at most 2,000 successful responses per warm server instance. Profiles are fresh for 30 seconds and may fall back to their original response for up to five minutes from fetch time. Battle logs are fresh for 15 seconds and may fall back for up to two minutes. Fallback is explicitly enabled only for the player/profile and battle-log routes.

Fallback applies to network errors, timeouts, HTTP 408/429 and 5xx (including proxy 520/525), and malformed successful JSON. HTTP 400/401/403/404 invalidate the old entry and remain errors. Missing credentials or invalid configuration never use cached data. Failure does not extend data age; a five-second cooldown reduces repeated failing refreshes. There are no automatic retries or alternate authenticated providers.

Successful responses expose `dataFreshness.status` (`live`, `cached`, `stale`) and the original `fetchedAt`. The search UI labels stale data in all ten languages. Browser/API responses are `no-store`, so client or CDN caches cannot silently relabel an old response as live. A cold instance has no fallback: this is not a durable, cross-instance cache or an upstream outage guarantee.

GET battle lookup remains read-only. POST retains origin checks and rate limits. A failed database save returns authentic upstream battles with `storageStatus: unavailable`; the UI explains that accumulation failed. Stale responses are not rewritten to the database (`skipped-stale`). Read failures still return errors rather than invented player/battle data. Logs contain static route IDs, status and timing, not raw provider errors, request URLs, credentials or player tags.

Denied/full browser storage no longer breaks profile search. Recent tags and favorites remain optional browser conveniences; failed persistence does not claim that the favorite was saved.

## Data collection status

`src/server/dataStatus.ts` executes the existing count definitions and top-ten lists in one PostgreSQL statement, using one connection and a consistent snapshot. Tie ordering is deterministic. Next's Data Cache shares the locale-independent public snapshot with a 300-second revalidation interval; an in-flight read is also deduplicated within the instance. This uses `unstable_cache` because the repo has not enabled Cache Components. It does not cache account or session data.

The page remains request-rendered via `connection()`, keeping database reads out of builds. The UI shows the actual snapshot time and explains that a failed refresh can retain older counts. A cold-cache DB failure renders a translated unavailable notice; it does not cache an error or present fabricated zero counts.

## Remaining operational checks

- Compare Vercel function region with the actual database region and measure several cold/warm requests. A single health check is not an average or proof that region placement is the cause.
- Run `EXPLAIN (ANALYZE, BUFFERS)` for the status aggregate in an authorized environment before adding indexes/materialized tables. These changes reduce repeat reads and connection use; they do not prove a faster uncached scan on production data.
- Public search limits remain process-local. Use a trusted-ingress/shared limiter or edge WAF when deploying a multi-instance abuse-control change; do not repurpose private account tables or trust arbitrary forwarding headers.
- Keep account sync behind its existing release gate until the real backup/restore/import/account-switch checks are complete. This reliability change does not activate it, change eligibility policy, or migrate production tables.
- Apply the local patch on a checkout reconciled with current `main`, preserving existing uncommitted work, before release. No branch reset is needed to implement these fixes.

Regression coverage includes transient/hard errors, bounded/expired fallback, coalescing, recovery, persistence failure, origin protection, localized notices and storage-denied browser search. Existing guest and Mini Game E2E remain required.

`dataStatus.integration.test.ts` runs against the CI disposable PostgreSQL through `DATA_STATUS_TEST_DATABASE_URL`. It only accepts an explicit loopback `*_test` database and creates a transaction-local temporary table, then rolls back. It never reads `.env.local` or defaults to the application's DB URL. Locally this suite skips when no disposable server is available.

Dependency audit remediation updates `sharp` to 0.35.5 and `source-map-js` to 1.2.2 within their existing compatible ranges. The original release also had a development-only `braces` advisory with no published fix; see the subsequent CI remediation below. Do not use `npm audit fix --force` to downgrade Next's lint configuration.

## Local validation (2026-10-10)

- ESLint and TypeScript: passed.
- Vitest: 201 passed, 5 skipped (3 disposable-PostgreSQL status tests and 2 existing account backup/manifest integration tests; Docker's local engine was unavailable).
- Actual generated status SQL: passed empty-table, count/duplicate/null semantics, Unknown exclusion, tie ordering and top-ten checks on an isolated in-memory PostgreSQL using PGlite 0.5.8. PGlite was installed as a temporary validation tool outside this repository, not added as an app dependency. This does not replace a networked PostgreSQL/Supabase integration or production query-plan measurement.
- Production build with accounts disabled, explicit unreachable local test DB and Mini Game fixtures: passed; 274 static pages and existing public ISR intervals preserved.
- Playwright core/Mini Game/player-search suite: 39 passed, including storage denial, stale profile and recommendation notices, save/stat failure notices, and localized status outage rendering. Only test data/local endpoints were used; real Google sign-in and DB-backed account/auth E2E were not run in this pass.
- Production dependency audit: 0 vulnerabilities. Full audit: 5 high findings from the same unresolved development-only `braces` dependency chain.
- Changes remain in the existing local working tree. The earlier image/config/release-doc changes were preserved. No production settings, DB schema/data, commit, push or deployment was changed by this pass.

## Release validation (2026-10-10)

The owner subsequently authorized deployment. The release branch starts from current `main` (`e88a48f`) and preserves the image transformation fix, home account control and localized quiz/SEO release. The original dirty checkout remains untouched.

- Release checkout: ESLint, TypeScript, fixture production build and `git diff --check` passed.
- Vitest: 205 passed, 5 skipped because no disposable local PostgreSQL/Docker engine was available.
- Playwright: all 44 core, Mini Game and player-search tests passed, including all-ten-locale crawler metadata and the existing account UI regressions.
- Production dependency audit: 0 vulnerabilities. Full audit still fails with the 5 existing development-only `braces` chain findings; the CI audit step has not been weakened or bypassed. This is not a fully green CI result.
- Deployment uses Vercel's Git build, not the local fixture build. No DB migration, OAuth/environment change or account-sync activation is part of this release.

## CI audit remediation (2026-10-10)

The red commit check was caused by `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`. [The braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) has no patched release; newer Next lint packages still use this dependency chain.

A scoped npm override replaces only the Next lint plugin's `fast-glob` with the private `tools/next-lint-glob` adapter backed by pinned `tinyglobby@0.2.17`. The installed Next plugin uses only `globSync(pattern, { onlyDirectories: true })` in `get-root-dirs`. [tinyglobby](https://github.com/SuperchupuDev/tinyglobby) provides that API without `braces` or `micromatch`; the adapter preserves literal-directory matching and absolute-path behavior, whose defaults differ between the libraries. Runtime Next.js and ESLint/Next rule versions are unchanged, and the full audit command remains enforced.

`scripts/next-lint-glob.test.mjs` exercises the actual installed Next root discovery with directory-only string/array/brace/Windows globs and literal roots, rejects an invalid HTML link to a discovered page, accepts `next/link`, and checks that other Next rules remain active. Unsupported future plugin calls throw instead of silently skipping checks. Keep these compatibility checks when updating Next; remove the adapter and override when the upstream plugin ships a safe dependency chain. This override is specific to the current plugin's usage, not a general replacement of every fast-glob API.
