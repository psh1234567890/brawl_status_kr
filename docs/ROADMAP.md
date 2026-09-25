# 로드맵

## 0.1.0 — 오픈소스 기반

- MIT 라이선스와 제3자 권리 범위 공개
- README·기여·보안·데이터 방법론 공개
- lint·test·build CI
- 태그 정규화·전투 지문·중복 방지 회귀 테스트
- 서비스에서 기여·방법론·피드백 경로 제공
- 첫 정식 릴리스와 알려진 한계 공개

## 0.1.3까지 구현된 항목

- 익명화 fixture 기반 팀전·쇼다운·카운터 집계 회귀 테스트와 legacy 마이그레이션 순서 검사
- PostgreSQL 백업·격리 복구 검증 도구와 운영·복구 문서
- 개인정보를 남기지 않는 API 요청·DB 작업 로그, 요청 ID, 응답 시간 및 DB 상태 점검
- `/meta`, `/counters`, `/skins`의 필터 상태를 유지하는 공유 URL
- 브라우저별 최근 검색·즐겨찾기와 재검색, 모바일 화면 및 기본 접근성 개선
- 10개 언어 UI와 주요 안내 문서

구현 범위와 릴리스별 변경은 [README](../README.md)와 [CHANGELOG](../CHANGELOG.md)를 참고한다.

## 0.2.0 — 운영 신뢰성

- 저장 성공·중복 무시·외부 API 오류를 개인정보 없이 집계해 추세 확인
- 데이터 신선도와 마지막 정상 수집 상태 표시
- 운영 DB에서 마이그레이션 사전 검증 및 복구 절차 반복 점검
- 스킨 보조 조회의 실패·캐시 상태 관측과 인스턴스 간 공유 캐시 검토
- 운영자 검토 기반 기록 요청 절차와 장기 보관 정책 구체화

## 0.3.0 — 이용자와 기여자 경험

- 플레이어 검색 결과를 직접 공유하는 링크와 즐겨찾기 재검색 안내 개선
- 비동기 상태 알림·키보드 조작 등 접근성과 모바일 사용성 추가 개선
- 다국어 경로의 서버 HTML `<html lang>`을 경로 언어와 일치시키는 라우트 구조 개선
- GitHub Discussions와 공개 유지보수 리듬
- 영어 요약 문서와 번역 기여 절차

## 장기 검토

- 여러 인스턴스에서 공유하는 rate limit
- 핵심 정규화·전투 지문 로직의 재사용 가능한 모듈화
- 통계적 신뢰구간 또는 최소 표본 기준 개선
- 사용자 동의와 최소 수집을 전제로 한 방문·재방문 측정

0.2.0 이후 항목은 계획이며 현재 구현된 기능으로 표현하지 않는다.

## 계정·Mini Game 확장 단계

### Phase 1 — 선택형 계정과 개인 최고 기록

Google-only OAuth, 내부 UUID, 중립 닉네임, 선택 대표 태그, private/client-reported
Mini Game PB sync, 명시적 localStorage import, account-scoped IndexedDB outbox,
로그아웃/탈퇴, 10개 언어 UI를 제공한다. guest 기능은 완전히 유지한다. 계정 삭제는
public tombstone + non-public safety ledger + HMAC deletion manifest로 백업 복원에서도
재적용할 수 있게 하며, eligibility/백업 정책은 운영값이 없으면 fail-closed다.

제외: 공개 랭킹, Daily Challenge, 공개 프로필, achievements, 전체 run history,
cloud favorites/recents, 추가 OAuth provider, 점수의 경쟁 검증.

### Phase 2 — 랭킹 검증 기반

immutable ruleset/question set, server-issued play session, sequence별 답 제출,
서버 timestamp/scoring, replay protection, anomaly review와 shadow leaderboard를
준비한다.

제외: 공개 leaderboard, Daily Challenge 출시, 보상, imported/client PB 승격.

### Phase 3 — Daily Challenge와 순위 공개

전 사용자에게 같은 날짜별 question ID/order/options를 주고, 계정당 counted
attempt를 적용한다. 별도 opt-in 공개 identity와 overall/weekly validated board,
moderation을 추가한다. 경계 시간대와 순위 공개 정책은 출시 전 소유자가 결정한다.

제외: cross-game 종합 점수, 금전 경쟁, offline ranked submission.

### Phase 4 — 개인화 확장

서버 검증 활동과 casual 활동을 구분하는 achievements/stats, 개인 dashboard,
cloud favorites/recents, 선택형 public profile을 추가한다.

제외: 메시지·팔로워, Brawl 계정 소유권 인증, 임의 파일 업로드.
