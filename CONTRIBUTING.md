# Brawl Status KR에 기여하기

버그 수정, 데이터 정확성 검토, 문서 개선, 번역 보완을 환영합니다. 이 프로젝트는 실제 이용자 검색에서 쌓인 표본을 다루므로 기능이 동작하는지만큼 통계의 의미를 바꾸지 않는 것이 중요합니다.

## 시작하기

필요한 환경은 Node.js 20 이상, npm, PostgreSQL입니다.

```powershell
git clone https://github.com/psh1234567890/brawl_status_kr.git
cd brawl_status_kr
Copy-Item .env.example .env.local
npm.cmd ci
npm.cmd run dev
```

`.env.local`에는 본인이 발급받은 키와 본인이 관리하는 개발용 DB만 사용하세요. 운영 키, 운영 DB 덤프, 실제 이용자 데이터는 이슈·PR·fixture에 올리지 마세요.

## 기여 절차

1. 버그, 기능, 데이터 정확성 중 맞는 이슈 양식으로 문제를 설명합니다.
2. 작은 범위의 브랜치를 만들고 관련 없는 변경을 섞지 않습니다.
3. 통계 로직을 바꾸면 계산 기준과 표본 편향에 미치는 영향을 함께 설명합니다.
4. 아래 검증을 통과시킵니다.
5. PR 본문에 재현 방법, 변경 이유, 검증 결과, 남은 위험을 적습니다.

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

DB 스키마를 바꾸는 PR은 마이그레이션, 롤백·복구 영향, 기존 데이터 보존 여부를 반드시 포함해야 합니다. 운영 DB에는 PR 코드나 미검증 마이그레이션을 직접 실행하지 마세요.

## 좋은 첫 기여

- 한국어 문구와 번역 오탈자
- 문서의 실제 구현 불일치
- 플레이어 태그 정규화와 전투 지문 테스트
- 익명화 fixture를 이용한 통계 회귀 테스트
- 접근성, 모바일 레이아웃, 오류 메시지 개선

## 데이터와 개인정보

- 실제 플레이어 태그를 테스트 데이터로 커밋하지 않습니다.
- 운영 DB 결과를 그대로 붙여 넣지 않습니다.
- 스크린샷에는 개인 식별 가능 정보와 키를 가립니다.
- 보안 취약점은 공개 이슈 대신 [SECURITY.md](SECURITY.md)의 비공개 절차를 사용합니다.

모든 기여자는 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)를 따라야 합니다.
