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
- 로그인 없는 기록 삭제 API
- 기본 프록시의 API 키 전달 위험
- 외부 Brawlify/BrawlAPI 데이터 가용성
- 의존성 high advisory 잔여

## 릴리스 전 체크

- [x] MIT 승인과 `LICENSE`
- [x] 출처 불명 게임 아이콘 제거와 고유 문자 아이콘 교체
- [ ] BrawlAPI·Brawlify 데이터 조건 확인
- [ ] CI가 공개 GitHub에서 통과
- [ ] 운영 저장 흐름 승인 테스트
- [ ] 모바일·데스크톱 smoke test
- [ ] 보안 P1 결정
- [ ] changelog 날짜와 tag 확정
- [ ] 공개 저장소 metadata 수정 승인

## 커밋 후보

1. `docs: add open source governance and contribution guides`
2. `test: cover tag normalization and conflict-safe battle storage`
3. `ci: verify lint tests and production build`
4. `docs: publish data methodology and self-hosting guide`
5. `feat: expose methodology and contribution links`

사용자는 2026-07-25 commit·branch push·draft PR 생성을 승인했다. 실제 release와 배포는 공개 CI와 보안 P1 결정을 확인한 뒤 진행한다.
