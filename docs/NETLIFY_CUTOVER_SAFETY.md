# Netlify 전환 안전 게이트 (2026-11-24)

## 2026-11-25 - current status (supersedes older entries)

- Commit 578d1af: all three CI jobs succeeded (run 45317685845);
  protected Netlify Preview deploy 6b05003f30d5d6a34da2d851 completed.
- Approved Supabase migration netlify_production_writer_nologin created the
  restricted writer role. Independent catalog verification: 74 scoped RLS
  policies, zero privilege mismatches, two permitted sequences, NOLOGIN,
  no elevated role attributes. The preview reader remains strictly read-only.
- Production credential automation is blocked by a tool security check.
  Do not repeat or bypass it. The last verified state: writer NOLOGIN,
  Production DATABASE_URL and DATABASE_SSL_CA empty, Preview values preserved.
  The operator must handle new credentials through official secure
  service interfaces; never paste them into chat, logs, Git or PRs.
- Supabase project region ap-southeast-1 (Singapore); TLS handshake and
  hostname verification succeeded on both regional session-pooler candidates.
  This is not a successful authenticated database connection. Use the exact
  pooler host shown in the project's Connect panel when configuring the writer.
- Existing production account backups and deletion manifests were present;
  fresh backup and actual isolated restore remain required at cutover.
- Keep Netlify Production release approval unset, accounts/maintenance off,
  and do not merge, publish or change DNS until separately approved.

### Remaining credential handoff (operator only)

Use the official Supabase dashboard and Netlify project Environment Variables
page. Configure only the production context, retaining the existing
DATABASE_URL secret status and Builds/Functions/Runtime scopes.
Use a new, unique password for the already-created brawl_netlify_writer
role; never reuse the postgres administrator or preview reader credential.
Use the exact Supabase session-pooler connection information for this project
and the verified CA. Keep the password out of chat and repository files.
Once the operator confirms registration, verify connection identity, TLS and
effective permissions with read-only queries before enabling accounts.
Existing Better Auth and Google OAuth production configuration must be
preserved to avoid invalidating the existing sessions. No real OAuth sign-in
against the shared production DB from Preview.

### Scheduled maintenance runtime safeguard

The separate Netlify scheduled function requires SITE_ID, an explicit
BRAWLOOP_NETLIFY_RELEASE_APPROVED=1, BRAWLOOP_NETLIFY_PRODUCTION=1,
NEXT_PUBLIC_BRAWLOOP_STAGING=0 and NETLIFY_ACCOUNT_MAINTENANCE=1
in its actual Functions-scoped runtime environment. All five conditions
must be satisfied; merely enabling maintenance or setting build-only
CONTEXT is insufficient. Leave these production flags disabled until the
release is approved. Never grant the preview reader additional write access.


## 2026-11-24 update (supersedes older status entries below)

- The protected PR #140 preview passed the synthetic WebP dual-write, read/hash and delete rehearsal in both blob stores. The temporary probe was removed in commit `914417e`. Production mirror configuration is not activated.
- The existing preview role was hardened; the subsequent catalog audit found 27 readable relations, zero write grants and zero accessible sequences. Do not rerun the earlier operator migration automatically.
- `scripts/netlify-production-writer-role.sql` proposes a separate, disabled NOLOGIN writer role with explicit per-relation grants and independently named RLS policies. It never changes the existing preview role.
- `scripts/test-netlify-production-writer-role.mjs` exercises both roles with real schema migrations, synthetic data, transaction rollback and reader privilege invariance inside an isolated PostgreSQL 17 Docker container. The new CI job must pass before approval.
- Still required: isolated application integration using the new writer, live OAuth rehearsal with separate credentials, backup/recovery review and explicit approval for production provisioning or DNS changes.


> 이 문서는 **준비·검증 절차**다. 작성이나 Draft PR 병합이 운영 DNS
> 변경·계정 활성화·권한 확대를 승인하는 것은 아니다.

## 현재 확인된 상태

| 항목 | 확인 결과 |
| --- | --- |
| 기존 Vercel 운영 | `www.brawl-o1.site` HTTP 200, `main` 변경 없음 |
| Netlify Preview #140 | 비공개 접근 보호, 읽기 전용 DB·기존 게시글·메타·외부 API 조회 성공 |
| 커뮤니티 이미지 | 기존 공개 첨부 1개를 Netlify Blob에서 읽음, Vercel 원본과 해시 일치 |
| Blob 저장소 | 임시 객체의 생성·읽기·해시·삭제 성공 |
| 계정 로그인 | Preview의 `ACCOUNTS_MODE=off`가 정상 차단, 운영 Google OAuth **미검증** |
| 계정 쓰기 | Supabase 역할은 `default_transaction_read_only=on`이지만 실제 `INSERT/UPDATE/DELETE` **권한이 있음**. 단순한 세션 기본값은 권한 차단이 아니므로 운영 변경 승인 전 **실제 쓰기 금지** |
| 롤백 이중 저장 | 코드/CI만 검증; 실제 Vercel Blob 토큰을 이용한 외부 쓰기 **미검증** |

## 게이트 A: 현재 안전한 읽기 전용 Preview

- `codex/netlify-db-preview-20261124` → Draft PR #140 → Netlify Deploy Preview.
- 운영용 `main`, Vercel 환경 변수, 공개 도메인/DNS, 기존 DB 데이터는 변경하지 않는다.
- `ACCOUNTS_MODE=off`, `ACCOUNT_SYNC_ENABLED=0`, `NEXT_PUBLIC_BRAWLOOP_STAGING=1`,
  `BRAWLOOP_NETLIFY_PRODUCTION=0`, `NETLIFY_ACCOUNT_MAINTENANCE=0`을 유지한다.
- Netlify 공식 문서에 따르면 `netlify.toml`의 `[build.environment]` 값은
  **서버리스 함수 런타임 환경 변수로 전달되지 않는다**. 이런 값을
  함수의 유일한 운영 안전장치로 사용하면 안 된다.
  [Netlify Functions 환경 변수 공식 문서](https://docs.netlify.com/build/functions/environment-variables/)
- 배포된 Netlify 함수가 반드시 제공받는 읽기 전용 `SITE_ID`와 빌드에 고정된
  `NEXT_PUBLIC_BRAWLOOP_STAGING=1`을 함께 확인해 계정 및 삭제 전용 로그인
  모드를 강제로 `off`로 처리한다. 따라서 대시보드에서 실수로
  `ACCOUNTS_MODE=on`을 지정해도 이 Preview에서는 로그인할 수 없다.
- Preview에서 실사용자 Google 로그인, 게시글 작성, DB 쓰기 테스트를 시도하지 않는다.
- 비밀값은 Netlify의 보호된 환경 변수에만 보관하고 로그/PR/채팅으로 꺼내지 않는다.

## 게이트 B: 이미지 롤백 보장

저장소 기본 경로는 배포별로 다르다.

- 기존 Vercel 운영: Vercel **private Blob** 저장소.
- 신규 Netlify: `COMMUNITY_IMAGE_STORAGE=netlify`면 Netlify Blob 저장소.
- `getStore("community-images")`는 **배포 버전 전용 저장소가 아니라 사이트
  단위 저장소**다. Deploy Preview도 같은 객체에 접근할 수 있으므로 합성 파일
  검증에는 충돌하지 않는 임의 키만 사용하고 기존 객체를 수정·삭제하지 않는다.
  [Netlify Preview 저장소 주의사항](https://www.netlify.com/knowledge-base/why-your-deploy-preview-can-delete-netlify-blobs-data/)
- 신규 이미지가 Netlify에만 있으면 Vercel로 롤백할 때 이미지가 사라져 보인다.

이번 코드에는 명시적인 이중 저장 모드가 있다.

| 환경 변수 | Netlify에서의 의미 |
| --- | --- |
| `COMMUNITY_IMAGE_STORAGE=netlify` | Netlify Blob을 기본 저장소로 사용 |
| `COMMUNITY_IMAGE_ROLLBACK_MIRROR=vercel` | 업로드 시 Vercel private Blob에도 동일 경로의 사본 생성 |
| `BLOB_READ_WRITE_TOKEN` | **서버 함수 전용 비밀값**. 기존 Vercel private Blob 저장소의 읽기·쓰기 권한 |

- 미러가 활성화되면 **Netlify 저장 성공 + Vercel 저장 성공** 이후에만 업로드가 성공한다.
- 미러용 토큰이 없으면 저장 전 503으로 실패하며, 미러 실패 시 Netlify 사본 삭제를
  시도하고 DB의 객체 정리 목록은 남겨 재시도할 수 있게 한다.
- 삭제·유지보수 중에는 양쪽 저장소를 모두 삭제한 뒤에만 객체 정리 목록을 제거한다.
- **모든 배포된 Netlify 함수(`SITE_ID` 존재)**에서 미러 설정 없이
  새 이미지 업로드를 차단한다. `BRAWLOOP_NETLIFY_PRODUCTION=1`도
  별도로 차단 조건에 포함한다. `NETLIFY`나 `CONTEXT`처럼 빌드에서만
  제공될 수 있는 변수에 의존하지 않는다.
- 미러를 끄거나 Vercel 저장소를 제거하기 전, 롤백 기간과 양쪽 객체의 상태를 확인해야 한다.
- Vercel 운영으로 롤백한 기간에 생성된 새 이미지는 Netlify로 재전환하기 전에
  **다시 Netlify Blob으로 증분 복사·검증**해야 한다.
- 이중 저장에는 두 서비스의 저장·요청 사용량이 발생한다. 무료 사용량과 예산을
  확인하지 않고 운영 설정을 켜지 않는다.

**운영 활성화 전 필수 실제 검증:** 운영자가 Vercel의 기존 저장소와 정확히 연결된
토큰을 Netlify의 비밀 변수로 직접 등록한 뒤, 별도 승인된 작은 **합성 이미지**
1개를 이중 저장 → 양쪽에서 해시 검증 → 양쪽에서 삭제한다. 사용자 게시글/
기존 이미지를 시험용으로 삭제·수정하지 않는다.

## 게이트 C: 회원·Google OAuth·DB 쓰기

1. DB 쓰기 전용 최소 권한 역할/연결 정책을 별도로 설계한다. 현재
   `brawl_netlify_runtime` 역할은 `default_transaction_read_only=on`이지만
   실제 DML 권한을 보유하므로 **엄밀한 읽기 전용 계정이 아니다**.
   이를 무단으로 승격하거나 세션의 `read_only`를 해제하지 않는다.
2. 기존 사용자 UUID와 인증 테이블·세션·삭제 ledger·RLS를 유지하며
   **운영 데이터가 아닌 격리 DB에서** 생성·수정·삭제·롤백을 먼저 시험한다.
3. Netlify 비밀 변수에 `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `ACCOUNT_RATE_LIMIT_SECRET`,
   `ACCOUNT_DELETION_MANIFEST_SECRET` 등 필수 값을 승인받아 입력한다.
   `BETTER_AUTH_URL`과 `ACCOUNT_TRUSTED_ORIGINS`는 정확한 **HTTPS origin**으로
   관리하고 와일드카드는 사용하지 않는다.
4. 실제 운영 콜백은 `https://www.brawl-o1.site/api/auth/callback/google`.
   Preview를 운영 Google OAuth 클라이언트에 무단으로 연결하지 않는다.
5. 계정 자격·약관/개인정보 안내·10개 언어 정책·백업 보존·삭제 manifest 및
   독립 키 복구/외부 보관을 `docs/ACCOUNT_RELEASE_READINESS.md`에 따라 검증한다.
6. **현재 계정 수가 0이 아니다.** 로그인 차단을 실제 운영으로 넘기지 않도록
   검증 결과를 확인한 뒤 별도 승인으로 점진적 활성화한다.
7. 백업·복구·삭제 전용 OAuth와 문의 경로를 확보하지 못하면 계정 롤아웃을 보류한다.

### 2026-11-24 권한 감사: 승인 전 수정 금지

Supabase `pg_roles` 및 `has_table_privilege()` 메타데이터를 **읽기 전용**
SQL로 확인했다. `brawl_netlify_runtime`의 직접·간접 유효 권한 수는 다음과 같다.

| 스키마 | 테이블/뷰 등 | SELECT | INSERT | UPDATE | DELETE |
| --- | ---: | ---: | ---: | ---: | ---: |
| public | 20 | 18 | 19 | 12 | 12 |
| analytics_private | 10 | 8 | 5 | 5 | 0 |
| account_safety | 1 | 1 | 1 | 1 | 1 |

- RLS가 적용된 테이블도 많은데, 해당 서버 역할에는
  `FOR INSERT/UPDATE/DELETE ... USING (true)` 정책이 존재한다.
- `default_transaction_read_only`는 **각 세션에서 변경할 수 있는 기본값**이지
  서버 계정의 `GRANT`를 철회하는 장치가 아니다.
  [PostgreSQL 공식 문서](https://www.postgresql.org/docs/current/sql-set-transaction.html)
- 현재 Preview가 공유 운영 DB에 연결되어 있으므로, 이 발견이 해소되기
  전에는 환경 변수 변경이나 실제 로그인/데이터 쓰기를 절대 실험하지 않는다.
- 권장 설계: **Preview 전용 계정의 DML·시퀀스 권한을 철회**하고,
  실제 전환 전에 별도 운영 쓰기 역할을 테스트 DB에서 검증한다.
  이 작업은 운영 Supabase 권한 변경이므로 **별도 최종 승인 이후에만** 실행한다.

### 실제 권한 변경안 — 미실행, 승인 대기

`scripts/netlify-preview-strict-readonly.sql`을 별도로 작성했다.
해당 SQL은 자동 배포·마이그레이션에 연결되지 않는다.

1. 실행 전에 **현재 역할의 직접 ACL 권한 목록을 별도 비밀이 아닌 감사 기록**으로
   확보하고, 필요한 시 원상복구할 수 있도록 검토한다.
2. 기존 로그인 가능한 `brawl_netlify_runtime`이
   `NOINHERIT`, `NOBYPASSRLS`, `default_transaction_read_only=on`인지 점검한다.
   전제조건이 다르면 SQL은 오류로 중단한다.
3. `public`, `analytics_private`, `account_safety` 내 테이블의
   `INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER` 권한과
   시퀀스의 `USAGE/SELECT/UPDATE`를 **해당 역할에서만** 철회한다.
   `SELECT`는 그대로 유지한다.
4. 실효 권한 검사에서 DML·시퀀스 권한이 하나라도 남으면 트랜잭션
   전체를 **ROLLBACK**한다. 다른 DB 역할, 사용자 데이터, RLS 정책,
   운영 Vercel의 DB 연결은 변경하지 않는다.
5. 실행 직후 읽기 전용 Netlify API가 정상인지 확인한다. 비정상이라면
   최초 권한 감사 기록과 `scripts/netlify-runtime-role.sql`의
   **정확한 기존 허용 목록**을 비교해 필요한 GRANT만 복원한다.
   포괄적 `GRANT ALL`로 복원하지 않는다.
6. SQL 적용만으로 모든 `SECURITY DEFINER` 함수 등 우회 경로가
   사라진 것은 아니다. 해당 기능 및 `PUBLIC` 함수 실행 권한을
   별도 감사한 뒤 Preview를 최종 읽기 전용으로 판단한다.

일회용 PostgreSQL CI에서 `scripts/test-netlify-preview-strict-readonly.mjs`
가 전체 권한 축소·멱등성·읽기 유지·실제 INSERT 거절·예상 밖의
`PUBLIC INSERT` 권한이 있으면 원자적으로 중단되는지 테스트한다.
이 CI는 **운영 DB에 접속할 수 없도록 localhost 및 `_test` DB로만 제한**한다.

## 게이트 D: 최종 운영 전환 및 되돌리기

1. 최신 CI 전체 통과, Netlify 프라이빗 기능·인증·블롭 이중 저장 검증,
   실제 API/DB 읽기와 쓰기, 비용·크레딧/쿼터 점검.
2. 운영자는 **전환 직전 시점의 계정 백업과 삭제 manifest 복구를 별도 검증**한다.
3. 최초 전환 직전에도 Vercel 롤백용 배포/Blob/인증 설정을 유지한다.
4. `netlify.toml`은 빌드 설정에서 모든 환경을 staging/off로 고정한다.
   하지만 해당 값은 함수 런타임의 보안 근거가 아니므로,
   실제 운영 전에는 Netlify의 **Functions 스코프 포함 환경 변수**도
   별도로 검증한다. `NEXT_PUBLIC_BRAWLOOP_STAGING` 빌드 플래그,
   `BRAWLOOP_NETLIFY_PRODUCTION` 런타임 값 및 `SITE_ID` 보호 정책 변경은
   **별도 코드 검토 및 명시적 운영 승인** 이후에만 진행한다.
5. 그 후에만 DNS·도메인 전환. 전환 후에는 Google callback/세션/커뮤니티/
   이미지·로테이션·전적/캐시/Cloudflare/비용을 모니터링한다.
6. 장애 시 신규 쓰기와 계정 동기화를 중지하고, Vercel로 되돌린 후
   이미지 미러 및 삭제 이력·DB 일관성을 확인한다. 운영 회원 DB를
   과거 snapshot으로 통째로 되돌리지 않는다.

### 변경 금지·주의

- 이번 Draft PR을 `main`에 병합하지 않는다.
- 현재 Supabase 사용자·회원 데이터를 수정하거나 권한을 확대하지 않는다.
- Vercel/Netlify 비밀값을 추출·로그·채팅으로 전달하지 않는다.
- DNS·운영 도메인·유료 플랜을 사용자 승인 없이 변경하지 않는다.

## Commercial-use boundary and standalone storage gate

Vercel Hobby is restricted to personal/non-commercial use across its services.
The Vercel mirror is therefore temporary migration infrastructure, not a
permanent dependency of a monetized site. Do not activate monetization while
the commercial application relies on Vercel Hobby.

Official references:
- https://vercel.com/legal/terms
- https://vercel.com/docs/plans/hobby
- https://www.netlify.com/blog/introducing-netlify-free-plan/
- https://docs.netlify.com/manage/accounts-and-billing/billing-for-credit-based-plans/credit-based-pricing-plans/

Before authorizing standalone storage:
1. Pause image mutations, compare the database inventory with both stores,
   verify every retained object by size and SHA-256, and reconcile deletions.
2. Verify a private, independently restorable backup and rehearse Netlify
   rollback/recovery. After standalone writes begin, the old Vercel
   deployment is not a valid rollback target without reconciliation.
3. Obtain explicit approval for the production cutover and secret removal.
4. In the approved production deployment only, set:
   - COMMUNITY_IMAGE_STORAGE=netlify
   - COMMUNITY_IMAGE_ROLLBACK_MIRROR=netlify-only
   - COMMUNITY_IMAGE_NETLIFY_ONLY_APPROVED=1
   - BRAWLOOP_NETLIFY_PRODUCTION=1
   - NEXT_PUBLIC_BRAWLOOP_STAGING=0 (build-time)
   - Remove BLOB_READ_WRITE_TOKEN and BLOB_STORE_ID from Netlify production.
   Keep the actual Netlify SITE_ID runtime variable intact.
5. Rehearse synthetic writes, reads, hash verification and deletion without
   any Vercel credential. Verify account maintenance and the recovery runbook.
6. Resolve retention/deletion obligations for legacy Vercel copies and verify
   removal of all live Vercel Hobby dependencies before monetization.
   Do not delete production data or cancel infrastructure automatically.

The current protected preview stays in the existing mirror/read-only mode.
The standalone code is an opt-in implementation, not authorization to deploy
or an assertion that the migration, recovery or billing checks are complete.
Check the actual Netlify plan and remaining credits before cutover; new
credit-based free plans have a hard 300-credit monthly allowance.

## Controlled build switch (review only)

The Netlify build wrapper derives public staging flags from the immutable build
context and branch plus the explicit BRAWLOOP_NETLIFY_RELEASE_APPROVED=1
operator approval. No approval is currently set. Without it, all builds stay
staging, even main. Preview/branch contexts reject an inherited approval.
Do not enable this variable until CI, production runtime configuration,
OAuth, backups, object reconciliation and cutover have been approved.
The wrapper sets build flags only; Functions-scoped runtime values still
require independent configuration and verification. Keep ads disabled until
Vercel Hobby dependencies are removed and account approval is obtained.
