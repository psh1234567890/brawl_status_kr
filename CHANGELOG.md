# 변경 기록

이 파일은 사용자와 기여자에게 의미 있는 변경을 기록합니다. 형식은 Keep a Changelog의 원칙을 참고합니다.

## Unreleased

- Playwright Chromium E2E를 추가해 player 검색 mock 흐름, 스킨 필터, 언어 전환, 모바일 내비게이션, 핵심 문서 경로를 production build에서 검증하고 CI에 연결
- 주요 API에 개인정보를 남기지 않는 구조화 요청/DB 작업 로그, `Server-Timing`/request ID, DB pool 오류 로그와 `/api/health` DB 상태 점검 endpoint를 추가하고, 무거운 meta 통계의 cache 재검증 주기와 client query timeout 여유를 조정
- Docker 기반 PostgreSQL custom archive 백업과 격리된 restore drill helper를 추가하고, 실제 운영 public 스키마 백업을 별도 PostgreSQL 17 테스트 DB에 복구해 row 수·인덱스·RLS 상태를 검증
- Search Console 실적에서 확인된 검색 의도에 맞춰 한국어 맵 도감·스킨 카탈로그·맵별 추천 브롤러의 title/description과 화면 설명을 개선하고, `/meta` 한국어 canonical/hreflang 연결을 보완
### Added

- 핵심 화면에 한국어·영어·일본어·브라질 포르투갈어·스페인어·튀르키예어·독일어·프랑스어·이탈리아어·러시아어 UI와 언어 선택기를 추가하고, 첫 방문 시 저장된 선택 또는 브라우저 `Accept-Language`로 적절한 홈으로 안내
- BrawlAPI 게임 로컬라이징 원본에서 브롤러·맵·모드뿐 아니라 브롤러/모드 설명, 능력과 스킨 표시명을 생성하는 `translations:ja:update`, `translations:additional:update` 스크립트와 회귀 테스트 추가
- 맵·브롤러·게임모드 도감/상세, 이벤트, 스킨, 클럽, 소개·방법론·개인정보·이용 안내·문의까지 10개 언어 지원 범위 확장
- 10개 언어의 정적 페이지와 맵·브롤러·게임모드 상세 URL에 canonical/hreflang 및 sitemap alternate 연결 추가

### Fixed

- 카운터 집계가 선택 브롤러의 실제 팀 관점을 복원한 뒤 승패를 계산하도록 수정
- 일반 2팀 전투만 양 팀 통계로 확장하고 듀오·트리오 쇼다운은 검색 플레이어 관점으로 유지
- 팀 조합 통계가 한 경기의 양쪽 팀을 모두 표본화하도록 수정
- 팀 조합 맵 선택 목록을 상위 결과 80개와 분리
- 누적 활동 요약을 전체 기간 기준으로 맞추고 일별 그래프의 60활동일 범위를 명시
- legacy DB 중복 제거보다 UNIQUE 인덱스가 먼저 생성되던 마이그레이션 순서 수정
- legacy backfill을 500행 배치로 처리하고 이미 완료된 행은 재실행 시 건너뛰도록 개선
- 동일 컬럼을 중복 인덱싱하던 legacy UNIQUE 인덱스를 migration에서 정리하고 DB 점검 스크립트에 필수 인덱스 검사를 추가
- Brawlace Jina Reader fallback URL을 단일 reader prefix로 정리하고 회귀 테스트 추가
- 카운터 브롤러 카탈로그를 불러오지 못했을 때 무한 로딩처럼 보이던 상태 수정

### Performance

- 팀 조합·카운터 통계에 60초 서버 캐시 추가
- 전투 fingerprint 조회 인덱스 추가
- 카운터 후보 전투를 JSONB containment로 먼저 줄이고, `battle_detail_json` GIN 인덱스를 migration에 추가
- Brawlify CDN 이미지는 Next Image 최적화를 사용하고 기타 출처만 unoptimized fallback 유지
- 홈 상세 모달을 dynamic import로 지연 로딩
- 프로세스 메모리 캐시와 rate-limit bucket에 상한 적용

### Security

- Next.js 16.3.5와 eslint-config-next 16.3.5로 갱신하고 PostCSS 8.5.28 적용
- 보안 패치 버전 업그레이드와 lockfile 갱신 후 현재 `npm audit` 0 vulnerabilities 확인
- 쓰기 API가 Origin 헤더 없는 요청을 거부하도록 강화
- DB 점검 스크립트가 실제 플레이어 태그 목록을 출력하지 않고 집계값만 표시하도록 변경
- CI에 high 이상 `npm audit` 차단 단계를 추가하고 앱 런타임 DB 쿼리에 timeout을 설정

### Documentation

- BrawlAPI 메타데이터, Brawlify CDN, Brawlace/Jina Reader의 실제 데이터 흐름을 README·Privacy·Third-party 문서에 맞춰 기록

## 0.1.0-rc.1 - 2026-07-25

첫 공개 프리릴리즈입니다.

### Added

- 오픈소스 기여, 지원, 보안, 데이터 산정 방식 문서
- GitHub 이슈·PR 양식, Dependabot, CI 구성
- 로컬 환경 변수 예시
- Codex for Open Source 준비도·검증·증거 문서
- 이용자 확보와 커뮤니티 피드백의 4~6주 실행 계획

### Changed

- `/status`를 요청 시점에 렌더링하여 운영 DB 없이도 프로덕션 빌드 가능
- Next.js와 프런트엔드 도구를 같은 메이저의 보안 패치 버전으로 갱신

### Security

- 현재 파일과 Git 기록의 비밀정보 패턴 감사

## 0.1.0 - 예정

첫 정식 공개 릴리스입니다. 제3자 데이터 조건, 운영 저장 흐름과 남은 의존성 경고를 검토한 뒤 확정합니다.
