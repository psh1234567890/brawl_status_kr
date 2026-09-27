# 계정 출시 준비 — 2026-09-28

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
