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
