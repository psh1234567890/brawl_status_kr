# 최종 검증 기록

## 2026-09-16 로컬 하드닝 후속 검증

- 기준 원격 커밋: `main` / `3553cb7` (`fix: stabilize search indexing catalog (#11)`)
- 검증 대상: 해당 커밋에서 시작한 현재 로컬 작업 트리의 통계 정확성·보안·마이그레이션·성능 개선
- 운영 DB 변경: 실행하지 않음. DB 점검은 `SELECT` 기반 읽기 전용으로만 수행

| 검사 | 결과 |
| --- | --- |
| `npm.cmd ci` | lockfile 기준 clean install 통과, 설치 직후 취약점 0건 |
| `npm.cmd run test` | 11개 파일, 35개 테스트 통과 |
| `npm.cmd run lint` | 통과 |
| `npm.cmd run build` | Next.js 16.3.5 프로덕션 빌드 및 TypeScript 검사 통과, 32개 정적 경로 생성 |
| `npm.cmd audit` | 0 vulnerabilities |
| `git diff --check` | 오류 없음. Windows 줄바꿈 변환 경고만 표시 |
| `npm.cmd run db:check` | 읽기 전용 점검 통과 |

읽기 전용 DB 점검 시 `battle_logs`는 56,693행이었고 `battle_fingerprint`, `battle_timestamp`, `battle_detail_json` 누락은 모두 0건이었다. 새 코드가 추가한 `battle_logs_battle_fingerprint_idx`는 아직 운영 DB에 없으므로 실제 적용에는 백업 후 `db:migrate` 실행이 필요하다. 이 검증에서는 데이터 변경을 피하기 위해 마이그레이션을 실행하지 않았다.

현재 DB에는 `player_tag, battle_time`에 대한 같은 정의의 legacy UNIQUE 인덱스와 canonical UNIQUE 인덱스가 함께 존재한다. 갱신된 마이그레이션은 canonical 인덱스를 보장한 뒤 legacy 중복 인덱스를 제거하도록 작성되어 있으나, 역시 이 후속 검증에서는 실행하지 않았다.

## 2026-07-25 공개 준비 검증 기록

- 작업 위치: `C:\Users\ADMIN\Desktop\brawl_status_kr_oss`
- 공개 기준: `main` 커밋 `e4843218eb56700b1b8746e29c5dff2718e9e0ee`
- 검증 대상: GitHub PR #1 병합 결과와 Vercel 프로덕션 배포

### 자동 검증

| 검사 | 결과 |
| --- | --- |
| `npm.cmd run lint` | 통과 |
| `npm.cmd run test` | 최신 회귀 테스트 포함 전체 통과 |
| `npm.cmd run build` | Next.js 16.3.5 프로덕션 빌드 통과 |
| 정적 페이지 생성 | 32개 경로 처리 완료 |
| `/status` | 요청 시 서버 렌더링되는 동적 경로로 확인 |
| `DELETE /api/player/history` | 공개 핸들러 제거 후 HTTP 405 확인 |
| API 연결 설정 | 명시적 HTTPS 주소만 허용하는 4개 경계 테스트 통과 |
| GitHub Actions `verify` | PR #1과 병합된 `main` 원격 실행 통과 |
| Vercel Preview | PR #1 배포 통과, 읽기 API HTTP 200 확인 |
| Vercel API 주소 | Production·Preview에 명시적 HTTPS 프록시 설정 등록 후 새 Preview 읽기 API HTTP 200 확인 |
| Vercel Production | 배포 `dpl_6CthtvMGbQGtQh5HcN3RPK1f585h` READY, canonical 도메인 연결 확인 |
| 운영 읽기 검증 | 홈·방법론·상태 HTTP 200, 랭킹 API HTTP 200 |
| 운영 삭제 차단 | `DELETE /api/player/history` HTTP 405 |
| 운영 런타임 오류 | 해당 배포의 error·fatal 로그 0건 |
| Markdown 로컬 링크 | 27개 Markdown 파일, 깨진 링크 0개 |
| GitHub YAML 파싱 | 6개 파일 통과 |
| `git diff --check` | 오류 없음 |
| 작업 트리 비밀정보 패턴 검사 | 실제 비밀정보 없음 |
| 전체 Git 기록 비밀정보 패턴 검사 | 실제 비밀정보 없음 |

비밀정보 패턴 검사가 찾은 `docs/SELF_HOSTING.md`의 두 URL은
`USER:PASSWORD@HOST` 형식의 명시적 예시 자리표시자다.

### 렌더링 검증

로컬 프로덕션 서버(`next start`)와 canonical 운영 도메인을 브라우저에서 직접 확인했다.

- 데스크톱 1440×900: 홈 제목·검색 화면·방법론 링크·비공식 팬 콘텐츠 고지 표시
- 링크 이동: 홈의 `데이터 산정 방식`에서 `/methodology`로 정상 이동
- 방법론: 제목과 5개 설명 섹션 표시
- 모바일 390×844: 검색 카드·입력·버튼이 가용 폭에 맞게 배치
- 모바일 가로 넘침: 없음(`scrollWidth`와 `clientWidth`가 동일)
- 위 세 시나리오의 브라우저 경고·오류: 0
- 운영 홈: 제목·검색 입력·방법론 링크·팬 콘텐츠 고지 표시, 가로 넘침과 콘솔 오류 없음
- 운영 방법론: 표본 한계와 계산 설명 표시, 가로 넘침과 콘솔 오류 없음

스크린샷:

- `docs/assets/home-desktop.png`
- `docs/assets/home-mobile.png`
- `docs/assets/methodology-desktop.png`

### 남아 있는 의도적 미검증

- 운영 DB에 쓰는 `POST /api/player/matches`
- 운영 DB 기록 요청의 실제 운영자 검토 절차

위 항목은 운영 데이터 변경을 수반하므로 실행하지 않았다.

### 의존성 감사

2026-09-16에 Next.js 16.3.5와 PostCSS 8.5.28로 보안 패치를 올리고, 강제 메이저 변경 없이 `npm audit fix`를 적용했다. 현재 `npm audit`은 **0 vulnerabilities**를 보고한다.
