# 아키텍처

## 구성

- Next.js 16 App Router + React 19 + TypeScript
- PostgreSQL + Drizzle ORM
- Brawl Stars API 또는 설정된 API 프록시
- Brawlify의 맵·모드·브롤러 메타데이터
- BrawlAPI 원본 데이터를 이용해 생성한 한국어 번역·스킨 카탈로그

## 플레이어 검색 흐름

1. 브라우저에서 태그의 공백과 선행 `#`을 제거하고 대문자로 정규화한다.
2. 프로필과 최근 전투를 병렬 요청한다.
3. 전투 요청은 `POST /api/player/matches`로 최근 최대 25개 전투를 받아 DB 저장을 시도한다.
4. 프로필이 성공하면 브라우저 `localStorage`에 최근 태그 최대 5개를 저장한다.
5. DB 누적 통계와 일별 기록을 다시 읽어 화면에 표시한다.
6. 즐겨찾기 최대 12개도 해당 브라우저에만 저장한다.

## 서버 경계

- API Route Handler가 입력 형식과 요청 빈도를 검사한다.
- 쓰기 요청은 Origin과 Fetch Metadata를 이용해 단순 cross-site 요청을 거부한다.
- Brawl Stars API 키는 서버에서만 읽는다.
- DB는 `DATABASE_URL`, 마이그레이션은 `DIRECT_URL`을 사용한다.
- `/status`는 요청 시점에 렌더링하므로 빌드 과정에서 운영 DB를 요구하지 않는다.

## 전투 저장과 중복 방지

각 행은 검색한 플레이어 태그 관점의 전투다. `(player_tag, battle_time)`과 `(player_tag, battle_fingerprint)`에 UNIQUE 제약이 있고, insert는 충돌 시 건너뛴다. 전투 지문은 전투 시간, 모드, 맵, 정렬된 참가자 태그로 만든다.

같은 팀전이 여러 플레이어 검색으로 여러 행에 존재할 수 있으므로 메타 집계에서는 같은 전투 지문 중 한 행만 선택한 뒤 양 팀 참가자를 펼친다. 쇼다운은 상대별 결과가 없으므로 검색 플레이어 관점 행을 사용한다.

## 캐시와 실패 처리

- 메타 통계: 60초 서버 캐시
- Brawlify 목록: 페이지별 revalidation 사용
- Brawlify가 HTML/403을 반환하면 빌드가 중단되지 않도록 빈 목록 fallback 사용
- 프로필은 성공했지만 전투·스킨·DB 통계가 실패하면 가능한 정보는 유지하고 부분 실패 안내를 표시

## 알려진 운영 제약

- rate limit가 프로세스 메모리 기반이라 여러 인스턴스 간 공유되지 않는다.
- 공개 플레이어 태그만으로 소유자를 확인할 수 없어 무인증 기록 삭제 API를 제공하지 않는다.
- 기본 API 프록시를 사용하면 서버 키가 해당 프록시에 전달된다.
- 운영 DB 없이 DB 기반 API와 `/status` 런타임 응답을 검증할 수 없다.
