# Brawl Stars Analytics KR

브롤스타즈 플레이어 프로필, 최근 전투 기록, 브롤러 장비, 검색 표본 기반 맵별 추천, 스킨 카탈로그를 제공하는 Next.js 앱입니다.

## 주요 기능

- 플레이어 태그 검색과 최근 검색 저장
- 최근 25전 승률, 연속 플레이 일수, 모드별 성과 계산
- 브롤러별 장착 스킨 이름, 가젯, 스타파워, 하이퍼차지, 기어 표시
- 검색한 플레이어의 전투 기록을 PostgreSQL에 중복 없이 적재
- 맵별 최소 5판 이상 표본을 기반으로 추천 점수 제공
- BrawlAPI 원본 파일을 이용한 한국어 번역과 스킨 카탈로그 생성

## 환경 변수

루트의 `.env.local`에 다음 값을 설정합니다.

```bash
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
BRAWL_STARS_API_KEY=...
# 선택: 직접 관리하는 프록시를 사용할 때만 설정
BRAWL_STARS_API_BASE_URL=https://example.com/v1
```

`DATABASE_URL`은 앱 런타임 연결, `DIRECT_URL`은 마이그레이션 연결에 사용합니다. 기본 외부 API 주소는 `https://bsproxy.royaleapi.dev/v1`입니다. 서버 API 키가 외부 프록시에 전달되므로 운영 환경에서는 신뢰 가능한 프록시 또는 직접 관리하는 고정 IP 프록시를 사용하세요.

## 실행

```bash
npm install
npm run db:migrate
npm run dev
```

개발 서버는 [http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 관리 명령

```bash
npm run lint
npm run test
npm run build
npm run db:check
npm run translations:update
npm run db:migrate
```

`db:migrate`는 기존 `battle_logs` 데이터를 유지하면서 정규화된 승패, 브롤러 ID, 실제 전투 시간, 경기 지문, JSON 원본 컬럼을 추가하고 기존 행을 보정합니다.

## API 구조

| 경로 | 메서드 | 역할 |
| --- | --- | --- |
| `/api/player?tag=...` | `GET` | 플레이어 프로필 조회 |
| `/api/player/matches?tag=...` | `GET` | 최근 전투 기록 읽기 전용 조회 |
| `/api/player/matches?tag=...` | `POST` | 최근 전투 기록 조회 및 DB 적재 |
| `/api/player/db-stats?tag=...` | `GET` | 검색한 플레이어의 누적 통계 |
| `/api/meta` | `GET` | 60초 캐시된 맵별 추천 통계 |

현재 호출 제한은 프로세스 메모리 기반입니다. 여러 서버 인스턴스로 확장할 때는 Redis 같은 공유 저장소 기반 제한기로 교체하세요.

## 데이터 해석

메타 통계는 전체 브롤스타즈 이용자 통계가 아니라 이 서비스에서 검색된 플레이어 기록 표본입니다. 쇼다운은 API의 순위를 기준으로 승패를 정규화합니다.
