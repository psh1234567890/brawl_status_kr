# 계정 출시 준비 — 2026-09-29

## 운영자가 확정한 제품 정책

- 게스트 기능: 로그인 없이 기존 이용 유지.
- 계정 기능: 만 16세 이상, 모든 국가, 보호자 동의 절차 미지원.
- 백업 보존 설정: 7일. 삭제 manifest 보존 설정: 14일.
- 버전과 10개 언어 안내문: `ACCOUNT_LAUNCH_POLICY.json`.

초기 전연령 계정 요청은 운영자가 만 16세 이상으로 변경했다. 이는 제품 결정이며
모든 국가의 법적 검토가 끝났다는 뜻은 아니다. Google 로그인은 연령 검증이 아니다.
현재 방식은 로그인 **전** 자격 안내와 명시적인 self-attestation이며, DOB/국가를
수집하지 않는다. 기준을 충족하지 못하면 Google 흐름을 시작하지 않고 게스트 기능을
이용한다. 정책 버전이 바뀌면 진행 중인 기존 OAuth state로 새 세션을 만들 수 없다.
로그인 뒤 약관·개인정보 안내 및 온보딩은 별도로 완료해야 한다.
기존 사용자의 삭제 전용 재인증에는 신규 가입 자격 확인을 다시 요구하지 않는다.

## 코드와 실제 운영의 구분

완료된 staging Google 검증은 `ACCOUNT_STAGING_SMOKE.md`에 기록돼 있다.
2026-09-28 사전 자격 확인 변경도 `a4b6849` Preview에서 실제 Google로 재검증했다.
온보딩·프로필·PB·동일 UUID 재로그인·일반/rollback 삭제는 통과했다. 재가입 직후
이전 삭제 대상 경고가 남던 현상은 탭별 sessionStorage와 이미 소비된 서버 삭제 intent의
불일치로 재현했고 수정했다. 수정 전 실패·수정 후 성공한 두 탭 회귀 테스트와
활성 삭제 intent의 다른 계정 차단 테스트를 추가했다. 이 후속 수정의 검증은 로컬/CI이며
`a4b6849`의 실제 Google smoke와 구분한다.
암호화 snapshot의 CI 격리 DB 검증과 실제 외부 보관 활성화는 별도로 구분한다.

`account-snapshots.yml`은 기본 비활성이다. 현재 Production 자격 증명·DB·환경변수를
변경하지 않았고 PR #56은 Draft 상태다. 예약 workflow는 main에 있어야 실행되므로,
작업 브랜치에 파일을 추가한 것을 예약 작업 활성화로 보고하지 않는다.

후속 `c72e884`의 [CI run 36345028541](https://github.com/psh1234567890/brawl_status_kr/actions/runs/36345028541)은
전체 성공했다. Vitest 172개, Core E2E 34개, Account/Auth E2E 11개, rollback E2E 3개가
통과했고, 일반 test 단계에서 생략한 PostgreSQL 통합 2개도 별도 격리 DB 단계에서 통과했다.
새 Preview `dpl_HVXnRzfZPsdB7JFxQGLyZzWp7scT`는 READY이며 `/api/account`가
`disabled`, sync false로 응답한다. Production은 기존 `main`의 `8fdd198` 배포 그대로다.

2026-09-28 GitHub API 조회 당시 계정 운영 전용 환경은 없었다. 이후 staging
운영 환경만 준비했으며, 아래 2026-09-29 기록을 현재 상태로 본다.

과거 시험 Preview `dpl_opq1cVvRiKXjR8L7vUVhPmXu5K67`(`7a39f60`)와
`dpl_FNpQY4zQbuLaaqmeiGtSbEB4eA2e`(`816316e`)의 개별 URL은 `/api/account`가
guest 상태로 응답해 아직 활성 계정 코드임을 확인했다. 현재 고정 staging을 꺼도
immutable 과거 배포는 꺼지지 않는다. 당시 이 두 시험 배포의 폐기는 승인 대기 상태였다.
다른 일부 과거 URL은 Vercel 인증 리다이렉트로 응답해 계정 활성 여부를 판정하지 않았다.
두 시험 배포는 2026-09-29 승인 후 삭제했다. 외부 보관/복구 준비를 끝내기 전
공개 출시를 진행하지 않는다.

## 2026-09-29 — staging 보관 환경 준비와 시험 배포 정리

운영자가 위 두 시험 Preview의 영구 삭제를 승인했다. 두 배포 ID는 Vercel에서
`exists: false`로 확인했다. 고정 staging 배포 `dpl_E1oVs9nNS2Nqr4Sm7gGFqTTHD3wL`은
READY이고 계정 기능은 off다. Production은 기존 `main` 배포
`dpl_34VGLENhjxZdNFUuH73ykHsFp57T` 그대로다.

GitHub 환경 `account-operations-staging`을 만들고 `main` 브랜치만 허용했다.
`ACCOUNT_SNAPSHOT_ENABLED=0`, staging 프로젝트 ref,
`ACCOUNT_SNAPSHOT_ALLOW_PRODUCTION=0`을 설정했다. 이 환경에는 읽기 전용 DB URL,
Supabase CA, 암호화 키, 삭제 manifest 서명키만 secret으로 저장했으며,
repository 활성화 변수 `ACCOUNT_SNAPSHOT_AUTOMATION_ENABLED`도 설정하지 않았다.
따라서 예약 백업·manifest export는 실행되지 않는다. staging DB의 전용
`brawl_staging_backup` 역할은 계정 9개 테이블·삭제 ledger의 `SELECT`만 갖는다.
강한 무작위 SCRAM 암호와 연결 수 제한 2를 설정했고, 공식 Supabase CA로 TLS를
검증한 세션 풀러 연결에서 계정 수와 ledger 수만 읽어 확인했다. 역할의 기본
트랜잭션은 읽기 전용이며, `students`·전투 테이블 `SELECT` 및 계정 쓰기 권한이
없음을 확인했다. 평문 DB 암호는 로컬 임시 파일에서 제거했다.

GitHub staging 환경의 삭제 manifest 서명키와 Vercel의
`feat/account-mvp-safety` Preview 전용 값을 일치시켰다. 재배포
`dpl_2Ldv6WouEhFDjCautAPJgvu6v1Nm`은 READY이고 staging 도메인에 연결됐으며,
`/api/account`는 `disabled`, sync false로 응답했다. Production 배포는 기존
`dpl_34VGLENhjxZdNFUuH73ykHsFp57T` 그대로다. 조회 중 Vercel CLI가 자동으로
만든 프로젝트 전체 자동화 우회 키는 즉시 폐기했고, 우회 키 수가 0임을 확인했다.

공식 PostgreSQL 17.11 도구로 로컬 격리 DB의 암호화 backup → 복구 → 최신
deletion manifest 재적용 통합 테스트가 통과했다. 별도로 staging 읽기 전용 역할에서
계정 전용 암호화 backup과 manifest를 실제 생성하고, 로컬 격리 DB로 복구했다.
dump에 `students`·전투 테이블이 없음을 확인했다. 복구 DB에 manifest가 지목하는
삭제 계정 1개를 **합성 행으로만** 되살린 뒤 재적용해 계정 1개와 세션 1개를
제거했다. 복구 후 계정·세션·OAuth verification은 0개, safety ledger는 4개다.
학생정보 원본 테이블은 조회·변경하지 않았다.

암호화 artifact와 키의 로컬 복구 사본은 현재 Windows 사용자 DPAPI 및 제한된
로컬 폴더에만 있다. GitHub secret은 쓰기 전용이므로 독립적인 키 복구 수단이
아니며, 별도의 외부 artifact 보관과 PC 유실 시 복구 가능한 키 보관도 아직 없다.
GitHub 예약 workflow는 main 전용이며 실행 플래그도 0으로 유지한다. 이 운영
복구 경로와 실패 알림을 검증하기 전에는 계정 출시 또는 예약 실행을 켜지 않는다.

## 2026-10-01 — 계정 비활성 배포 준비

운영자가 계정 코드의 배포 진행을 승인했다. Production의 현재 기준은 이미지 변환을
중지하고 Next.js 16.3.8을 적용한 `c4500fe`다. 이 변경을 계정 브랜치에 합쳐 최종
CI를 다시 확인한 뒤 배포한다. 이전 날짜의 Production commit 기록은 당시 상태다.

이번 배포에서는 계정 migration·운영 Google OAuth·운영 secret을 변경하지 않는다.
Production 계정 관련 env가 없는 상태에서 기본 `ACCOUNTS_MODE=off`, sync false,
deletion-only false를 유지하고 `/api/account`의 disabled/no-store 응답을 확인한다.
계정 페이지가 배포되는 것과 실제 Google 로그인 공개는 구분한다.

확인 당시 GitHub의 account 운영 환경은 staging만 존재하고 `ACCOUNT_SNAPSHOT_ENABLED=0`이다.
repository 자동 실행 변수도 없다. workflow가 main에 들어가도 예약 보관을 활성화하지 않는다.
독립적인 키 복구·외부 보관 실행·실패 알림 검증이 끝나기 전에는 pilot/on을 열지 않는다.

## 출시 전 실행 순서

1. 새 코드의 CI와 격리 DB 암호화 backup → 복구 → 최신 deletion manifest 재적용 →
   복구 세션/state 폐기 검증을 확인한다.
2. staging만 사전 자격 확인 → 실제 Google callback → 온보딩 → PB → 삭제를 재검증한다.
   staging DB의 `students`는 조회·dump·복구 대상으로 삼지 않는다.
3. 계정 전용 읽기 역할과 staging용 외부 보관·키 복구 경로를 구성하고 실제 snapshot을
   내보낸 뒤 격리 DB에서 복구한다. DB 역할은 필요한 계정 테이블 및 safety ledger의
   SELECT만 갖도록 한다. RLS 때문에 dump가 막히면 fail-closed하며 RLS를 끄지 않는다.
4. 별도 Production 변경 승인 후 계정 migration·정확한 OAuth callback·정책 env·
   삭제 maintenance·암호화 외부 보관·모니터링을 구성한다. 먼저 계정은 off로 배포한다.
5. 운영 최신 manifest 확보 및 서명/암호화 키 복구를 검증한 다음 제한된 pilot을 연다.
   이후 계정 on, sync 별도 활성화. 실패 시 sync off → accounts off + deletion-only.

예약 실행 실패/오래된 manifest/키 유실을 감지할 담당자와 알림 경로가 있어야 한다.
이 단계까지 확인되지 않으면 계정은 off로 유지한다. 이미 운영 계정이 있는 롤백에서는
삭제 전용 OAuth·DB·문의 경로를 유지한다. Production 적용과 PR merge는 이 문서 작성으로
승인되지 않는다.

## 정책 검토 근거

- [개인정보보호위원회: 아동 법정대리인 동의 위반 처분](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=11818)
- [GDPR 제8조](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng): 동의를 근거로 아동에게
  직접 제공하는 온라인 서비스에는 국가별 기준과 보호자 동의 요건이 적용된다.
- [FTC COPPA 안내](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions):
  아동 대상 서비스/실제 인지 등 적용 범위는 단순한 연령 체크박스만으로 결정되지 않는다.
