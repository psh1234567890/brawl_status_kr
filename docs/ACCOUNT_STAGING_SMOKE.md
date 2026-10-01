# 계정 Phase 1 staging 검증 기록

검증일: 2026-09-27 (Asia/Seoul). 대상은 `feat/account-mvp-safety`의
`https://staging.brawl-o1.site`와 staging Supabase `yxukggorpqsrwurbamxv`다.
Draft PR #56은 merge하지 않는다. Production DB, 환경변수, OAuth 및 배포는
이 검증 대상이 아니다. 아래 결과는 실제 Google 경로와 CI 결과를 구분한다.

## 실제 staging Google smoke

실제 Google 경로는 `fe9cd44` Preview에서 검증했다. 사용자 직접 로그인 및
온보딩 확인 이후, 같은 Google 계정 선택과 재인증을 위임받아 이어서 확인했다.

| 항목 | 결과 및 확인 방법 |
| --- | --- |
| Google callback / 계정 생성 | PASS: user, Google identity, 유효 DB session 생성 |
| 최소 정보 | PASS: Google 사진, OAuth access/refresh/ID token, password, session IP/UA가 NULL |
| 온보딩 | PASS: 사용자가 staging 안내를 확인하고 제출; staging 정책 버전 기록 |
| 프로필 | PASS: 닉네임 저장, ` #2py `를 `2PY`로 정규화, profile revision 증가 |
| 플레이 PB | PASS: Brawler Quiz 3분 수동 종료 1/108, ruleset 1, `client_play` 저장 |
| 로그아웃 | PASS: DB session 제거, guest 화면 전환 |
| guest 기록 | PASS: 연습 1/108은 로그인 전 cloud로 전송되지 않음 |
| 재로그인 | PASS: 동일 Google 계정의 내부 UUID와 프로필 유지 |
| 명시적 import | PASS: 선택 전 자동 업로드 없음; 선택 후 연습 PB `legacy_import` 저장, 기존 v1 브라우저 기록 유지 |
| PB 표시 | PASS: 서버의 두 PB 표시; import acknowledgement 이후 갱신과 반복 GET 방지는 브라우저 회귀 테스트로 추가 검증 |
| 일반 삭제 | PASS: 같은 계정의 새 Google callback 이후 삭제; user/account/session/PB/receipt가 0, tombstone 및 safety ledger 각각 1 |
| 재가입 | PASS: 같은 Google 계정이어도 새 UUID, 온보딩 미완료, PB 없음 |
| rollback 삭제 | PASS: `off`, sync `0`, deletion-only `1`; 로그아웃 상태에서 기존 Google identity를 찾아 삭제, cascade 및 ledger 확인 |
| rollback 가입 차단 | PASS: 삭제된 identity의 callback이 `signup_disabled`; 새 user/session 생성 없음 |

삭제 재인증 요청은 `prompt=select_account`, `max_age=0`, PKCE S256을 사용했다.
같은 내부 UUID/Google identity와 새 DB session에 묶인 서버 삭제 proof를 확인했다.
이 결과를 Google의 비밀번호·2FA 재입력 강제가 검증됐다는 의미로 사용하지 않는다.

최종 staging 테스트 계정, identity, session, PB, receipt는 모두 제거했다.
두 삭제 UUID의 tombstone/safety ledger는 보존했다. `public.students` 내용에
접근하거나 구조/데이터를 변경하지 않았으며, app role의 SELECT 권한은 false다.
공유 staging DB에서 전체 backup/restore를 실행하지 않았다.

## 자동 검증과 수정

- Supavisor 연결은 제공자 CA와 hostname 검증을 사용하며 TLS 검증을 끄지 않았다.
- import 후 PB 표시 갱신, cache 채움에 의한 sync/GET 반복 방지 회귀 테스트 추가.
- 일반 로그인 버튼을 명시적으로 선택하면 이전 삭제 UI 대상만 초기화한다.
  삭제 재인증 callback의 계정 불일치 검사와 서버 proof 검사는 유지한다.
- 로컬: ESLint, TypeScript, Vitest 146 PASS, audit 0 vulnerabilities,
  accounts off production fixture build, Core Playwright 32 PASS, diff check PASS.
- 로컬 Docker daemon을 사용할 수 없어 DB 통합 테스트는 GitHub CI의 disposable
  PostgreSQL에서 실행한다. `fe9cd44` CI에서 Account/Auth 9 PASS, rollback 3 PASS,
  deletion-manifest restore integration 1 PASS 및 migration 재실행 검증을 확인했다.
- 새 UI 회귀 테스트는 Playwright의 로컬 응답 fixture만 사용하며 production
  auth bypass나 실제 Google 자동 테스트 endpoint를 추가하지 않는다.

## 출시 전 남은 조건

2026-09-28 후속 결정: 운영자가 계정 만 16세 이상·모든 국가·보호자 동의 미지원과
backup 7일/manifest 14일을 선택했다. `ACCOUNT_LAUNCH_POLICY.json` 참조.
아래의 당시 미확정 목록 중 정책 수치는 확정됐지만, 실제 env 적용·외부 보관 활성화·
새 로그인 전 자격 확인의 Google smoke는 별도 검증 대상이다.

1. 실제 최소 연령/허용 지역/보호자 동의 지원 범위를 운영자가 확정하고 게시한다.
   staging의 18세/all/not-supported는 시험 설정이며 운영 승인이 아니다.
2. 실제 backup/manifest 보존 일수, 외부 manifest 보관 위치, 서명키 관리 및
   export/prune 실행 자동화를 확정한다. manifest 보존은 backup보다 길어야 한다.
3. 운영 복구 절차에서 최신 manifest를 재적용한 뒤 공개하는 runbook과 담당자를
   확인한다. CI의 복구 테스트 성공을 운영 backup 자동화 완료로 간주하지 않는다.
4. 운영 OAuth/별도 자격 증명, 계정 migration만 적용, maintenance와 모니터링,
   제한된 pilot 및 kill switch 준비를 확인한 뒤 별도 출시 승인을 받는다.

staging 시험 설정을 Production으로 복사하지 않는다. 계정 공개 전에는
`ACCOUNTS_MODE=off`, `ACCOUNT_SYNC_ENABLED=0`을 유지한다. 실제 운영 계정이
존재하는 긴급 rollback에서만 `ACCOUNT_DELETION_ONLY=1`로 삭제 경로를 보존한다.

## 2026-09-28 — 새 사전 자격 확인의 실제 Google 재검증

대상 소스는 `a4b6849fa8e6935e2aa8a06c00b8cdfb62957d15`다. 운영자가
staging만 잠시 활성화하도록 승인한 뒤 Preview의 해당 작업 브랜치에서만 검증했다.
일반 계정 smoke는 `dpl_HCkgqFbw97oNdPR9Wyjo36dMrfQS`, 삭제 전용 smoke는
`dpl_9SNDWAXbLKVug2oPmn2u1D3XT9zU`에서 실행했다.

| 항목 | 실제 결과 |
| --- | --- |
| 로그인 전 자격 안내 | PASS: 만 16세/all/not-supported 안내, 확인 전 Google 버튼 비활성 |
| 새 Google OAuth state / callback | PASS: 사전 자격 확인 후 실제 Google callback으로 새 계정·identity·DB session 생성 |
| 최소 수집 | PASS: 중립 닉네임, 사진·provider token·password·session IP/UA NULL |
| 새 정책 온보딩 | PASS: 운영자가 현재 안내 제출을 승인했고 정확한 staging terms/privacy/eligibility 버전 기록 |
| 프로필 | PASS: 닉네임 저장, ` #2py ` → `2PY`, revision 증가 |
| 기존 브라우저 기록 | PASS: 명시적 가져오기 전 PB 0, 선택 후 3분/연습 1/108 두 슬롯만 `legacy_import`로 저장 |
| 실제 플레이 sync | PASS: 5분 Brawler 수동 종료 1/108, `client_play`, ruleset 1, 서버 receipt 생성 |
| 로그아웃·재로그인 | PASS: session 0 → 새 session 1; 원래 내부 UUID·프로필·PB 3개 유지 |
| 일반 삭제 | PASS: fresh Google callback 뒤 user/identity/session/PB/receipt 모두 0, tombstone와 14일 safety ledger 생성 |
| 삭제 후 재가입 | PASS: 원래 UUID와 다른 UUID, 온보딩 미완료, PB 0. 아래 UI 관찰 사항은 별도 |
| rollback 기존 사용자 삭제 | PASS: accounts off / sync 0 / deletion-only 1에서 로그아웃한 기존 Google 계정을 재인증하여 삭제; cascade와 14일 ledger 확인 |
| rollback 신규 생성 차단 | PASS: 삭제된 identity로 다시 callback하면 `signup_disabled`; 새 사용자·세션 생성 없음 |

삭제 재인증 URL에서 `max_age=0`, `prompt=select_account`, PKCE `S256`을 직접 확인했다.
Google 비밀번호/2FA 입력 강제를 검증했다는 뜻은 아니다. Google에 새 동의 화면은
나타나지 않았으며, 해당 계정의 기존 로그인 상태에서 계정 선택으로 callback을 확인했다.

재가입 직후 이전 삭제 대상과 다른 계정이라는 UI 경고가 한 번 관찰됐다. 같은 Google
identity에 새 내부 UUID가 발급되는 것은 정상이며 DB 계정 격리는 유지됐다. 로그아웃 후
삭제 전용 경로는 정상 동작했다. 이 관찰 사항은 아래 후속 로컬 회귀 수정에서 별도로
다뤘으며, 당시 실제 Google smoke에서 경고가 없었다고 소급해서 보고하지 않는다.

최종 테스트 계정·identity·session·PB·receipt는 모두 0이다. 과거 두 항목을 포함한
삭제 ledger/tombstone 네 항목은 보존하며, 이번 두 ledger는 14일이다. 과거 시험의
2일 ledger 보존 시각은 임의로 변경하지 않았다. 학생 테이블의 내용·구조를 읽거나
변경하지 않았고 app role의 students SELECT 권한은 계속 false다.

이 검증은 실제 외부 암호화 보관 예약 작업이나 staging snapshot 복구 검증을 대체하지
않는다. 공유 staging DB 전체 dump/restore는 실행하지 않았다. Production 변경,
main push 및 PR #56 merge는 하지 않았다.

최종 `dpl_2S8E5BYRJrZzMnBFPyeEr9njBLwf` Preview는 같은 `a4b6849` 소스로
READY다. 해당 브랜치의 `ACCOUNTS_MODE=off`, `ACCOUNT_SYNC_ENABLED=0`,
`ACCOUNT_DELETION_ONLY=0`으로 복구하고 고정 staging 주소의 비활성 화면을 확인했다.
기존 Production 배포는 변경하지 않았다. 환경 플래그 변경만으로 과거 immutable
배포가 꺼지는 것은 아니므로, 이번 smoke의 임시 on/삭제 전용 Preview 두 배포는
검증 후 삭제하고 Vercel 배포 목록에서 제거된 것을 확인했다. 최종 off 배포는 유지한다.

## 2026-09-28 — 삭제 후 다른 탭의 오래된 UI 경고 수정

두 탭에 삭제 대상 A의 sessionStorage marker가 남은 상태에서 한 탭이 A를 삭제하면,
다른 탭의 marker는 자동으로 지워지지 않는다. 이후 새 UUID B로 로그인하면 서버의
삭제 intent가 이미 없는데도 브라우저 marker만으로 불일치 경고를 표시하던 현상을
로컬 fixture에서 재현했다. 수정 전 회귀 테스트가 해당 경고 assertion에서 실패했다.

서버 `/api/account`가 현재 요청의 유효한 삭제 intent 존재 여부를 boolean으로 반환하고,
일반 계정 UI는 서버 intent가 없는 오래된 marker를 무시하도록 수정했다. 이 값은 UI
힌트이며 삭제 권한이나 재인증 proof가 아니다. 실제 DELETE의 동일 UUID·Google identity·
fresh session·서버 intent·Origin·rate limit 검사는 유지한다. 유효한 다른 계정의 삭제
intent가 있는 경우 기존 불일치 차단도 유지한다. rollback DTO와 삭제 전용 동작은 유지한다.

- 로컬: ESLint, TypeScript, Vitest 172 PASS / DB 통합 2 skip, audit 0 vulnerabilities,
  accounts off production fixture build 및 Core Playwright 34 PASS.
- 두 탭 회귀와 활성 intent 불일치 차단은 위 34개에 포함된다. 데스크톱/390px 모바일에서
  오래된 경고가 없고 재인증 버튼이 활성화되며 가로 overflow가 없는 것도 확인했다.
- DB intent의 만료 후 activity가 false로 바뀌는 Account E2E를 추가했다. 로컬 Docker
  daemon이 실행되지 않아 실제 DB 경로는 GitHub CI의 disposable PostgreSQL에서 검증한다.
- production auth bypass, 테스트용 로그인 endpoint, 실제 환경변수 변경은 추가하지 않았다.
  이 후속 수정에 대해 실제 Google 재로그인을 새로 실행한 것은 아니다.

`c72e884`의 [CI run 36345028541](https://github.com/psh1234567890/brawl_status_kr/actions/runs/36345028541)은
전체 SUCCESS다. Account/Auth 11 PASS(새 intent 만료 검사 포함), rollback 3 PASS,
Core 34 PASS 및 PostgreSQL deletion-manifest/암호화 snapshot 복구 통합 각 1 PASS를
확인했다. 계정 migration 재실행도 성공했다. 새 Preview
`dpl_HVXnRzfZPsdB7JFxQGLyZzWp7scT`는 READY, 계정 disabled/sync false다.
고정 staging 계정 화면에서도 비활성을 확인했다. Production의 `8fdd198` 배포와
Draft PR #56 상태는 유지한다.

과거 배포 목록 추가 점검에서 `7a39f60`/`816316e`의 시험 Preview 두 개가 여전히
계정 guest 응답을 반환했다. 폐기 승인 대기 상태이며 현재 off 배포로 덮어쓴 것으로
간주하지 않는다. 외부 예약 보관의 운영 환경/키도 아직 구성 완료로 확인되지 않았다.
