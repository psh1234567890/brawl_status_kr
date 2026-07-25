# v0.1.0 릴리스 후보 계획

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
- 의존성 high advisory 잔여

## 릴리스 전 체크

- [x] MIT 승인과 `LICENSE`
- [x] 출처 불명 게임 아이콘 제거와 고유 문자 아이콘 교체
- [ ] BrawlAPI·Brawlify 데이터 조건 확인
- [x] CI가 공개 GitHub PR #1에서 통과
- [ ] 운영 저장 흐름 승인 테스트
- [x] 모바일·데스크톱 smoke test
- [x] 무인증 기록 삭제 API 제거
- [x] 묵시적 제3자 프록시 기본값 제거
- [x] Vercel Production·Preview에 공식 문서가 안내하는 RoyaleAPI Brawl Stars HTTPS 프록시 주소 명시
- [x] PR #1을 `main`에 병합하고 canonical 프로덕션 배포 검증
- [x] changelog 날짜와 `v0.1.0-rc.1` tag 확정
- [x] 공개 저장소 description·topics·homepage 수정

## 커밋 후보

1. `docs: add open source governance and contribution guides`
2. `test: cover tag normalization and conflict-safe battle storage`
3. `ci: verify lint tests and production build`
4. `docs: publish data methodology and self-hosting guide`
5. `feat: expose methodology and contribution links`

사용자는 2026-07-25 공개 변경 진행을 승인했고 PR #1은 `main`에 병합됐다. 프로덕션 배포와 읽기 흐름은 검증됐지만, 실제 `v0.1.0` 태그와 GitHub Release는 제3자 데이터 조건·운영 저장 흐름·남은 advisory를 검토한 뒤 진행한다.
