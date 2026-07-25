# 보안과 비밀정보 감사

- 감사일: 2026-07-25
- 범위: 현재 추적 파일, 50개 Git 커밋의 텍스트 blob, 의존성, 주요 API 경계

## 비밀정보 검사

다음 패턴을 실제 값은 출력하지 않는 방식으로 파일명만 검사했다.

- OpenAI·GitHub·Google·Slack 형태의 토큰
- PEM private key
- 사용자명·비밀번호가 포함된 DB URL
- 긴 Brawl Stars API key 할당
- JWT 형태 문자열
- `.env` 계열 파일의 Git 기록

결과: 현재 추적 파일과 Git 기록에서 일치 파일 없음, `.env` 추적 기록 없음.

이는 모든 비밀 노출이 없음을 보장하지 않는다. GitHub Secret Scanning 또는 별도 검증 도구를 함께 사용하는 것이 좋다.

## 구현된 방어

- 플레이어·클럽 태그 형식 검증
- API route별 메모리 기반 rate limit
- 쓰기 요청의 Origin·`Sec-Fetch-Site` 검사
- Drizzle parameterized query와 고정 SQL
- API 키의 서버 전용 사용
- CSP, HSTS, frame 차단, MIME sniffing 차단, permissions policy
- 외부 API status/content-type 검증과 timeout
- 전투 UNIQUE 제약과 conflict-safe insert

## 확인된 위험

### P1 — 로그인 없는 기록 삭제

`DELETE /api/player/history?tag=...`는 cross-site 요청을 막고 분당 6회로 제한하지만 로그인이나 태그 소유권 확인이 없다. 제3자가 공개 태그를 이용해 해당 태그의 DB 행을 삭제할 수 있다.

필요한 결정:

- 삭제 API를 운영자 인증으로 제한
- 또는 사용자가 태그 소유를 증명하는 방법 설계
- 또는 공개 삭제를 중단하고 수동 요청 절차 제공

운영 데이터와 사용자 흐름을 바꾸므로 승인 없이 수정하지 않았다.

### P1 — 제3자 프록시에 API 키 전달

`BRAWL_STARS_API_BASE_URL`이 없으면 `https://bsproxy.royaleapi.dev/v1`을 사용하며 서버 API 키를 Authorization header로 전송한다. 프록시 신뢰, 로그, 보관, 키 회전 정책을 확인해야 한다. 운영에서는 직접 관리하거나 명시적으로 신뢰한 프록시를 권장한다.

### P2 — 분산되지 않은 rate limit

프로세스 메모리 기반 Map이므로 인스턴스마다 제한이 따로 적용되고 재시작 때 초기화된다. `x-forwarded-for` 신뢰도도 배포 환경에 의존한다. 규모가 커지면 공유 저장소와 배포 플랫폼의 신뢰 가능한 client IP 규칙이 필요하다.

### P2 — 원본 전투 JSON의 불명확한 보관 기간

통계 필드 외에 전체 전투 JSON을 장기 보관한다. 개인정보처리방침의 기간이 구체적이지 않다. 최소 필드 장기 보관·원본 JSON 단기 보관 등 정책 결정이 필요하다.

### P2 — 의존성 감사 잔여

패치 후 `npm audit`은 high 11건을 보고한다. 주요 원인은 현재 Next.js 계열의 `sharp` 0.34.x와 ESLint 9 계열의 `brace-expansion/minimatch` advisory다. 자동 수정안은 Next.js 14 downgrade 또는 ESLint 10 major upgrade를 제안해 현재 Next.js 16 구조에 큰 호환성 위험이 있다.

현재 적용:

- Next.js 16.2.6 → 16.2.11
- React 19.2.4 → 19.2.8
- Tailwind/PostCSS 도구 4.3.3
- PostCSS override 8.5.18
- Vitest 4.1.10

남은 조치:

- Next.js가 `sharp >=0.35`를 지원하는 패치 추적
- `eslint-config-next`가 ESLint 10을 공식 지원할 때 업그레이드
- advisory 영향 범위와 배포 설정을 릴리스 전에 재검토
- `npm audit fix --force`는 사용하지 않음

## 아직 확인하지 못한 항목

- GitHub repository secret scanning 활성화 상태
- 운영 DB 계정의 실제 권한
- Vercel 환경 변수·로그·보존 설정
- 운영 API 프록시 설정과 키 회전
- Security Advisory의 실제 접수 테스트
- 승인된 쓰기 검색을 통한 live DB 저장 검증
