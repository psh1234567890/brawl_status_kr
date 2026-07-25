# 공개 근거 기록

측정값은 확인 날짜와 출처를 함께 기록한다. 아직 측정하지 못한 값은 추정하지 않는다.

## 2026-07-25

### 공개 저장소 — 병합 전 기준선

- URL: <https://github.com/psh1234567890/brawl_status_kr>
- 공개 여부: public
- maintainer 권한: 연결된 GitHub 계정에서 admin·maintain·push 확인
- 기본 브랜치: `main`
- 공개 commits: 50
- 별: 2
- 포크: 0
- watcher: 0
- open issue/PR: 0
- 공개 기여자: 저장소 소유자 1명, 외부 기여자 0명
- 릴리스·태그·Actions workflow: 0
- GitHub community profile: 14%
- description: 없음
- topics: 없음
- homepage: 이전 Vercel URL

출처: GitHub 공개 페이지와 GitHub API. 값은 시간에 따라 변할 수 있으므로 신청 직전에 다시 확인한다.

### 라이브 서비스

- canonical URL: <https://www.brawl-o1.site/>
- 홈, status, rankings, meta, sitemap, robots: HTTP 200 확인
- 공개 읽기 API: rankings 200, meta 200
- 공개 글로벌 랭킹의 한 태그를 이용한 읽기 전용 검증: profile 200, battle log 200(25 items), DB stats 200, history 200
- 라이브 status:
  - 저장 전투 5,864
  - `검색 플레이어` 130
  - 맵 112
  - 브롤러 104
  - 최근 수집 2026-07-04 03:36 KST 표시

`검색 플레이어 130`은 상태 페이지가 `count(DISTINCT player_tag)`로 계산한 고유 저장 태그 수다. 사용자·브라우저·계정 수가 아니다.

승인 없는 운영 변경을 피하기 위해 `POST /api/player/matches` 쓰기 검증은 실행하지 않았다.

### 아직 없는 지표

- 최근 30일 고유 방문자
- 최근 30일 페이지뷰
- 최근 30일 성공 검색 횟수
- 7일 재방문
- 신규 전투 지문 수
- 중복으로 무시된 insert 시도 수
- 실제 외부 피드백·기여자 수
- live error rate와 uptime

이 값들은 측정 체계와 개인정보 검토 후 추가한다.

### 오픈소스 준비 병합과 프로덕션 검증

- PR #1: <https://github.com/psh1234567890/brawl_status_kr/pull/1>
- 상태: 2026-07-25 병합
- `main` 병합 커밋: `e4843218eb56700b1b8746e29c5dff2718e9e0ee`
- 공개 `LICENSE`: GitHub API가 MIT(`SPDX: MIT`)로 감지
- CI: PR #1과 병합된 `main`의 lint·test·build 통과
- 저장소 metadata:
  - description: `Korean Brawl Stars player search and sample-based battle analytics`
  - homepage: <https://www.brawl-o1.site/>
  - topics: analytics, brawl-stars, korean, nextjs, open-source, postgresql, typescript
- Vercel 프로덕션 배포: `dpl_6CthtvMGbQGtQh5HcN3RPK1f585h`, READY
- canonical 운영 검증:
  - 홈, `/methodology`, `/status`: HTTP 200
  - `/api/rankings?type=players&country=global`: HTTP 200, 정상 JSON
  - `DELETE /api/player/history`: HTTP 405
  - 홈·방법론 브라우저 콘솔 오류와 프레임워크 오류 오버레이: 0
  - 해당 배포의 error·fatal 런타임 로그: 0

운영 DB 쓰기 요청은 실행하지 않았고, 태그·Release도 아직 만들지 않았다.
