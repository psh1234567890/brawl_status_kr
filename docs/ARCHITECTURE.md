# 아키텍처

## 구성

- Next.js 16 App Router + React 19 + TypeScript
- PostgreSQL + Drizzle ORM
- Brawl Stars API 또는 설정된 API 프록시
- BrawlAPI의 맵·모드·브롤러·이벤트 메타데이터와 번역·스킨 카탈로그 원본
- Brawlify CDN의 게임 이미지
- 공식 플레이어 API의 현재 착용 스킨을 baseline으로 하고, 기본 비활성·명시적 opt-in 방식의 Brawlace/Jina Reader가 성공한 경우에만 전체 보유 스킨 목록으로 확장

## 플레이어 검색 흐름

1. 브라우저에서 태그의 공백과 선행 `#`을 제거하고 대문자로 정규화한다.
2. 프로필과 최근 전투를 병렬 요청한다.
3. 전투 요청은 `POST /api/player/matches`로 최근 최대 25개 전투를 받아 DB 저장을 시도한다.
4. 프로필이 성공하면 브라우저 `localStorage`에 최근 태그 최대 5개를 저장한다.
5. DB 누적 통계와 일별 기록을 다시 읽어 화면에 표시한다.
6. 즐겨찾기 최대 12개도 해당 브라우저에만 저장한다.

## 서버 경계

- API Route Handler가 입력 형식과 요청 빈도를 검사한다.
- 쓰기 요청은 Origin과 Fetch Metadata를 이용해 단순 cross-site 요청을 거부한다.
- Brawl Stars API 키는 서버에서만 읽는다.
- DB는 `DATABASE_URL`, 마이그레이션은 `DIRECT_URL`을 사용한다.
- 앱 런타임 DB 풀은 연결 5초, 서버 statement 10초, client query 12초 timeout을 두어 비정상적으로 오래 걸리는 요청이 DB 자원을 계속 점유하지 않게 한다.
- `/status`는 요청 시점에 렌더링하므로 빌드 과정에서 운영 DB를 요구하지 않는다.

## 전투 저장과 중복 방지

각 행은 검색한 플레이어 태그 관점의 전투다. `(player_tag, battle_time)`과 `(player_tag, battle_fingerprint)`에 UNIQUE 제약이 있고, insert는 충돌 시 건너뛴다. 전투 지문은 전투 시간, 모드, 맵, 정렬된 참가자 태그로 만든다.

같은 팀전이 여러 플레이어 검색으로 여러 행에 존재할 수 있으므로 메타 집계에서는 같은 전투 지문 중 한 행만 선택한 뒤 양 팀 참가자를 펼친다. 쇼다운은 상대별 결과가 없으므로 검색 플레이어 관점 행을 사용한다.

## 캐시와 실패 처리

- 맵·팀 조합·카운터 메타 통계: 60초 서버 캐시
- BrawlAPI 메타데이터 목록: 페이지별 revalidation 사용
- 기본 BrawlAPI 엔드포인트가 실패하면 정적 mirror를 시도하고, 페이지에서는 빈 목록 fallback으로 빌드 중단을 피함
- 프로필은 성공했지만 전투·스킨·DB 통계가 실패하면 가능한 정보는 유지하고 부분 실패 안내를 표시

## 알려진 운영 제약

- rate limit가 프로세스 메모리 기반이라 여러 인스턴스 간 공유되지 않는다.
- 공개 플레이어 태그만으로 소유자를 확인할 수 없어 무인증 기록 삭제 API를 제공하지 않는다.
- Brawl Stars API 연결 주소는 인증정보 없는 HTTPS URL로 명시해야 하며 묵시적 프록시 기본값은 없다.
- 운영 DB 없이 DB 기반 API와 `/status` 런타임 응답을 검증할 수 없다.

## 선택형 계정 MVP

계정은 게스트 기능 위에 얹는 선택 기능이다. 기본 설정은 `ACCOUNTS_MODE=off`, `ACCOUNT_SYNC_ENABLED=0`이며 서버 API도 같은 값을 강제한다. `pilot`은 `GOOGLE_PILOT_SUBJECT_ALLOWLIST`에 명시된 Google `sub`만 허용하고, `on`은 공개 출시 정책이 준비된 뒤에만 사용할 수 있다. 계정 정책 버전 3개, 10개 언어의 명시적 자격 안내, 구조화된 eligibility rules, 백업/삭제-manifest 보존 기간, deletion-manifest HMAC secret이 함께 설정되지 않으면 `pilot`/`on`이어도 계정 기능은 닫힌다.

Better Auth 1.7.6은 Google OAuth와 PostgreSQL opaque session을 담당한다. Better Auth 모델은 `src/db/schema.ts`의 `auth_users`, `auth_accounts`, `auth_sessions`, `auth_verifications`에 명시적으로 매핑한다. 내부 UUID가 앱의 안정적인 사용자 ID이고, 비공개 이메일과 Google subject는 공개 DTO·로그·랭킹에서 제외한다. 프로필을 따로 복제하지 않고 닉네임, 대표 태그, 정책 동의 버전을 `auth_users`에 둔다. 개인 최고 기록과 rate-limit/idempotency 데이터는 별도 `minigame_personal_bests`, `account_*` 테이블에 저장한다.

계정 관련 데이터는 RLS가 활성화된 `public` 테이블이며 브라우저 DB 접근 정책은 없다. Next.js Node 런타임의 기존 `src/db/index.ts` 풀을 재사용한다. public 전투 테이블과 사용자 계정 사이에는 FK가 없으므로 태그 설정이나 계정 삭제가 공개 전투 기록을 변경하지 않는다.

삭제 복구 안전성은 public dump와 분리한다. 계정 삭제 transaction은
`public.account_deletion_tombstones`와 함께 `account_safety.deletion_ledger`에도
삭제 UUID·시각·만료 시각·정책 버전을 기록한다. `account_safety` schema는
`public` schema dump에 들어가지 않으므로 public-schema rollback 뒤에도 삭제 ledger를
보존할 수 있다. 외부 복구를 위해 동일 ledger를 HMAC 서명 JSON manifest로 export하며
복구 전에 `db:deletions:reapply`가 해당 UUID의 복원된 계정 행을 다시 제거한다.

계정 DDL은 기존 전투 마이그레이션 및 backfill과 분리한다. `npm run db:migrate:accounts`는 명시적인 `ACCOUNT_MIGRATION_DATABASE_URL`만 사용하고 기본은 loopback 대상만 허용한다. `scripts/migrate-db.mjs`는 계정 기능에 사용하지 않는다. 빌드 중 마이그레이션은 없다.

개인 최고 기록은 클라이언트 보고 casual PB일 뿐 경쟁 랭킹에 사용할 수 없다. 업로드는 계정 세션에서 사용자 UUID를 가져오며, 브라우저 값은 최대 9개 허용 슬롯으로 검사한다. 비율 비교는 반올림 백분율이나 기록 시각이 아닌 정수 교차곱으로 하고, DB의 조건부 upsert가 더 나쁜 후보와 동점을 보존한다. 첫 legacy import는 명시적 확인 뒤 IndexedDB outbox와 operation UUID를 사용한다.

계정 island는 `PortalLayout`에만 붙으며 레이아웃·공개 페이지·메타데이터·sitemap loader는 세션을 읽지 않는다. `/account` 페이지는 robots noindex이며 sitemap에는 등록하지 않는다. 계정 API는 private/no-store다.

Eligibility는 DOB/국가를 계정 테이블에 수집하는 방식이 아니라 운영자가 승인한
`minimumAge`, `regions`, `guardianConsent`, `attestation` 규칙과 현지화 안내문을
사용한다. 현재 지원되는 guardian-consent 모드는 `not-supported`뿐이며 사용자는
정책을 읽고 충족한다고 self-attest한다. 운영자가 실제 연령/지역 기준을 정하지 않으면
구조화 규칙이 유효하지 않아 계정 기능 전체가 fail-closed다.
