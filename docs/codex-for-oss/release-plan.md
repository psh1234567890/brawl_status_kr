# v0.1.0 릴리스 계획

## 포함할 내용

- 한국어 플레이어 검색과 최근 전투 분석
- 보유 브롤러·장비·스킨 정보
- 전투 지문과 UNIQUE 제약 기반 중복 방지
- 검색 표본 기반 맵·팀·카운터 통계
- 오픈소스 문서, 기여 양식, CI
- 데이터 산정 페이지와 비공식 팬 프로젝트 고지

## 알려진 한계

- 전체 이용자 공식 통계가 아닌 검색 표본
- 고유 태그 수와 사용자 수를 구분할 분석 체계 부족
- 메모리 기반 rate limit
- 계정 없는 서비스라 자동 기록 삭제 대신 운영자 검토 요청을 사용
- 명시한 API 또는 프록시의 신뢰·고정 IP·키 회전 운영 확인 필요
- 외부 Brawlify/BrawlAPI 데이터 가용성
- 릴리스 후에도 제3자 데이터 조건, 의존성, 장기 운영 상태를 정기적으로 재확인할 필요

## 릴리스 전 체크

- [x] MIT 승인과 `LICENSE`
- [x] 출처 불명 게임 아이콘 제거와 고유 문자 아이콘 교체
- [x] Brawlify CDN 공개 사용 조건과 Supercell 정책 연결 확인
- [x] BrawlAPI 현재 공개 API 접근 조건(no auth/static API) 확인 및 Supercell 권리 경계 문서화
- [x] Brawlace 제3자 자동 조회·재사용 허용이 명시되지 않아 runtime 보조 조회를 기본 비활성·명시적 opt-in으로 제한
- [x] Jina Reader 자동 fallback을 기본 비활성으로 변경하고 명시적 opt-in으로 제한
- [x] CI가 공개 GitHub PR #1에서 통과
- [x] 실제 운영 백업을 격리 DB에 복구한 뒤 production build + 로컬 HTTPS mock upstream으로 저장 1행·중복 0행·fingerprint/timestamp/JSON 생성 검증
- [x] 모바일·데스크톱 smoke test
- [x] 무인증 기록 삭제 API 제거
- [x] 묵시적 제3자 프록시 기본값 제거
- [x] Vercel Production·Preview에 공식 문서가 안내하는 RoyaleAPI Brawl Stars HTTPS 프록시 주소 명시
- [x] PR #1을 `main`에 병합하고 canonical 프로덕션 배포 검증
- [x] changelog 날짜와 `v0.1.0-rc.1` tag 확정
- [x] 공개 저장소 description·topics·homepage 수정
- [x] 실제 PostgreSQL 백업·격리 복구 drill과 앱 smoke 검증
- [x] 주요 API observability·health endpoint와 Playwright E2E를 CI에 연결
- [x] 핵심 사용자 화면·도감·안내 문서의 10개 언어 지원과 hreflang/sitemap 확장

## 커밋 후보

1. `docs: add open source governance and contribution guides`
2. `test: cover tag normalization and conflict-safe battle storage`
3. `ci: verify lint tests and production build`
4. `docs: publish data methodology and self-hosting guide`
5. `feat: expose methodology and contribution links`

사용자는 2026-07-25 공개 변경 진행을 승인했고 PR #1은 `main`에 병합됐다. 이후 rc.2와 후속 hardening에서 다국어, SEO, DB 복구 drill, observability, E2E/CI, 공유 URL, 광고 비활성 기본값, 제3자 보조 조회 opt-in, 실제 저장·중복 방지 검증까지 운영 준비도를 보강했다. 위 릴리스 전 체크를 모두 통과한 `main` 커밋에만 `v0.1.0` 태그와 정식 GitHub Release를 생성한다.
