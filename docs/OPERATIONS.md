# 운영 모니터링

## API 구조화 로그

다음 API는 요청마다 query string, 플레이어 태그, 맵 이름, 브롤러 이름, IP를 기록하지 않고 정적 route 식별자와 상태만 JSON 한 줄로 남긴다.

- `api.player`
- `api.meta`
- `api.meta.teams`
- `api.meta.counters`
- `api.health`

로그 필드는 `event`, `route`, `method`, `status`, `durationMs`, `requestId`, `slow`, 배포 `region`/짧은 commit SHA다. 5xx는 error, 느린 요청은 warning, 그 외는 일반 log 레벨을 사용한다. 처리 중 예외가 handler 밖으로 빠져나가면 원문 message/stack 대신 `errorName`만 기록한다.

캐시 재검증처럼 HTTP 요청이 끝난 뒤에도 실행될 수 있는 DB 작업은 `server_operation` 이벤트로 별도 기록한다. 현재 `db.meta.stats`, `db.meta.teams`, `db.meta.team_maps`, `db.meta.counters`를 계측하며, 입력된 player/map/brawler 값 자체는 로그에 넣지 않는다. 따라서 background revalidation의 query timeout도 어느 작업이 몇 ms 뒤 실패했는지 식별할 수 있다.

2026-09-21 로컬 production smoke에서 운영 DB를 향한 콜드 `db.meta.stats`가 약 11.8초 걸리는 사례를 관측했다. SQL 자체의 `statement_timeout`은 10초로 유지하고 결과 수신까지 포함하는 client `query_timeout`만 15초로 두어 전송 구간 여유를 확보했다. 같은 고비용 통계의 cache revalidation은 60초에서 300초로 완화해 반복 부하와 background timeout 빈도를 낮춘다. 쿼리 rewrite 후보 두 가지는 복구 DB 벤치에서 기존 쿼리보다 느려 적용하지 않았다.

각 응답에는 `Server-Timing: app;dur=...`와 `X-Request-Id`를 추가한다. 이를 이용해 브라우저/network 로그와 Vercel 서버 로그의 같은 요청을 연결할 수 있다.

## Health endpoint

`GET /api/health`는 DB에 `SELECT 1`을 실행한다. 정상일 때 HTTP 200과 DB latency를, 실패할 때 HTTP 503과 `ok: false`만 반환한다. DB 호스트, 연결 문자열, 오류 message 같은 내부 정보는 응답하지 않는다. 응답은 `no-store`이며 별도 rate limit이 있다.

외부 uptime 도구를 연결할 때는 `/api/health`의 HTTP status만 기준으로 감시하고, 과도하게 짧은 polling 주기는 사용하지 않는다.

## E2E 회귀 테스트

Playwright Chromium E2E는 build 산출물을 `next start`로 띄운 뒤 실행한다. player search는 외부 Brawl Stars API나 운영 DB를 사용하지 않고 브라우저 네트워크 mock으로 전체 UI 흐름을 검증한다. 스킨 필터, 언어 전환, 모바일 빠른 내비게이션, 주요 문서 경로도 함께 검사한다.

```powershell
npm.cmd run build
npm.cmd run test:e2e
```

CI에서는 production secret 없이 build한 뒤 Chromium과 시스템 의존성을 설치하고 같은 E2E suite를 실행한다.

## 선택형 계정 운영

계정 기능은 기본적으로 `ACCOUNTS_MODE=off`, `ACCOUNT_SYNC_ENABLED=0`이다.
일반 pull request preview에는 계정 DB·OAuth 자격 증명·trusted origin을
연결하지 않는다. `*.vercel.app` wildcard trusted origin은 허용하지 않는다.
계정 활성화에는 `ACCOUNTS_MODE=pilot|on`, Better Auth URL/secret, Google
OAuth client 자격 증명, `ACCOUNT_RATE_LIMIT_SECRET`, 약관·개인정보·자격
정책 버전, 모든 10개 언어의 자격 안내, `ACCOUNT_ELIGIBILITY_RULES_JSON`,
백업 정책 버전/보존 일수, `ACCOUNT_DELETION_MANIFEST_SECRET`이 필요하다.
manifest 보존 일수는 backup 보존 일수보다 길어야 한다. 하나라도 빠지거나
유효하지 않으면 서버는 계정 API를 닫는다.

OAuth callback 등록 개념은 local `http://localhost:3000/api/auth/callback/google`,
전용 staging host `https://<staging-host>/api/auth/callback/google`, production
`https://www.brawl-o1.site/api/auth/callback/google`이다. CI는 Google consent를
열지 않고 synthetic PostgreSQL user/account/session과 Better Auth 공개
`makeSignature` utility로 서명한 세션 쿠키를 쓴다. 실제 Google staging smoke는
별도 검증이며 CI 결과로 주장할 수 없다.

계정 DDL은 `npm run db:migrate:accounts`만 사용한다. runner는
`ACCOUNT_MIGRATION_DATABASE_URL` 외의 DB 변수를 fallback으로 사용하지 않고,
checksummed ledger와 PostgreSQL advisory lock을 같은 transaction에서 쓴다.
기본 허용 대상은 localhost/loopback이다. 원격 격리 DB는 직접 확인 후에만
`ACCOUNT_MIGRATION_ALLOW_REMOTE=1`을 붙인다. `npm run db:migrate` 및
`scripts/migrate-db.mjs`는 기존 전투 정리/backfill을 포함하므로 계정 DDL에
호출하면 안 된다.

출시 순서는 격리 DB에서 migration 및 복구 확인 → 계정 migration 별도 적용 →
accounts off 배포 → 환경별 OAuth 설정 → 제한된 pilot → 전용 staging에서 Google
실제 로그인 확인 → 연령/지역 기준과 backup/manifest 보존 일수 확정·게시 →
deletion manifest 외부 보관 경로 확인 → 계정 on → sync 별도 활성화다.
Pilot은 Google subject allowlist로 제한한다.

Eligibility rules는 예를 들어
`{"minimumAge":18,"regions":"all","guardianConsent":"not-supported","attestation":"self"}`
형식이다. 이는 제품 정책의 기술적 표현일 뿐 실제 최소 연령이나 허용 지역을 대신
결정하지 않는다. 현재 guardian-consent 수집/검증 workflow는 없으므로
`guardianConsent`의 다른 값은 거부된다. DOB/지역 자체는 계정 DB에 저장하지 않는다.

백업 보존 자동 정리는 기본 dry-run이다. `npm run db:backup:prune`으로 삭제 예정
파일을 검토하고, 승인 후 `npm run db:backup:prune -- --apply`를 실행한다.
`account-deletions-latest.json`은 prune 대상이 아니며 timestamped deletion manifest는
`ACCOUNT_DELETION_MANIFEST_RETENTION_DAYS`까지 보존한다.

`vercel.json`은 `/api/internal/account-maintenance`를 매일 UTC 04:17에
호출한다. route는 GET/POST 모두 `Authorization: Bearer <CRON_SECRET>`를
constant-time 비교한 뒤 만료 session/state/receipt/rate-limit/tombstone/safety-ledger만
정리한다. 만료 시각 검사는 정리 cron에 의존하지 않는다. Vercel 배포에
`CRON_SECRET`을 설정하기 전에는 endpoint가 fail-closed로 응답한다.

### 롤백

먼저 `ACCOUNT_SYNC_ENABLED=0`으로 PB 쓰기를 멈추고 필요하면
`ACCOUNTS_MODE=off`로 일반 로그인·신규 계정 생성·프로필·온보딩·PB API를 닫는다.
평상시 pre-launch/off 상태에서는 `ACCOUNT_DELETION_ONLY=0`을 유지한다. 이미 계정이
운영된 뒤 긴급 롤백하여 기존 사용자 삭제 경로를 보존해야 할 때만
`ACCOUNT_DELETION_ONLY=1`을 함께 설정한다.
기존 계정의 삭제 전용 경로는 유지된다. 로그인된 사용자는 기존 Google identity에
묶인 재인증을 시작할 수 있고, 로그아웃됐거나 세션이 만료된 사용자는 삭제 전용
Google 흐름에서 이미 연결된 Google identity만 찾아 삭제를 진행할 수 있다. 이
흐름은 일반 로그인 화면이나 계정 기능을 열지 않으며, 전용 Better Auth 설정은
신규 가입을 차단하고 callback 뒤 기존 Google subject와 내부 사용자 UUID를
검증한다. Google OAuth 자격 증명, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, DB,
`ACCOUNT_RATE_LIMIT_SECRET`을
삭제 전용 경로가 필요한 동안 유지한다. 세션·계정 데이터베이스를 사용할 수 없으면
삭제 경로도 fail-closed로 응답하므로 문의 경로를 함께 안내한다.

앱만 이전 버전으로 돌리고 additive 계정 테이블과 데이터를 남긴다. 이 테이블을
drop하거나 오래된 전체 DB snapshot으로 새 계정 쓰기를 덮어쓰지 않는다. 운영 계정
삭제 및 문의 경로는 롤백 중에도 보존한다.

계정 migration runner는 SQL 줄바꿈을 LF로 정규화한 SHA-256을 저장한다. 이미
적용한 ledger의 기존 LF/CRLF 원문 체크섬도 받아들인 뒤 정규 체크섬으로 갱신하므로
줄바꿈만 바뀐 체크아웃은 checksum mismatch로 취급하지 않는다. `0004`는 기존 PB
중 ruleset version 1 이외의 행이 있으면 데이터를 지우거나 변환하지 않고 transaction을
중단한다. 이 경우 계정 migration 적용 전에 해당 행을 검토해야 한다. `0005`는
public dump 밖의 `account_safety.deletion_ledger`를 만든다. public-schema restore로
ledger object가 사라졌지만 migration checksum은 남은 경우 runner가 object 부재를
확인한 뒤 같은 idempotent SQL을 재적용한다.
