# 운영 모니터링

## API 구조화 로그

다음 API는 요청마다 query string, 플레이어 태그, 맵 이름, 브롤러 이름, IP를 기록하지 않고 정적 route 식별자와 상태만 JSON 한 줄로 남긴다.

- `api.player`
- `api.meta`
- `api.meta.teams`
- `api.meta.counters`
- `api.health`

로그 필드는 `event`, `route`, `method`, `status`, `durationMs`, `requestId`, `slow`, 배포 `region`/짧은 commit SHA다. 5xx는 error, 느린 요청은 warning, 그 외는 일반 log 레벨을 사용한다. 처리 중 예외가 handler 밖으로 빠져나가면 원문 message/stack 대신 `errorName`만 기록한다.

캐시 재검증처럼 HTTP 요청이 끝난 뒤에도 실행될 수 있는 DB 작업은 `server_operation` 이벤트로 별도 기록한다. 현재 `db.meta.stats`, `db.meta.teams`, `db.meta.team_maps`, `db.meta.counters`를 계측하며, 입력된 player/map/brawler 값 자체는 로그에 넣지 않는다. 따라서 background revalidation의 query timeout도 어느 작업이 몇 ms 뒤 실패했는지 식별할 수 있다.

2026-09-21 로컬 production smoke에서 운영 DB를 향한 콜드 `db.meta.stats`가 약 11.8초 걸리는 사례를 관측했다. SQL 자체의 `statement_timeout`은 10초로 유지하고 결과 수신까지 포함하는 client `query_timeout`만 15초로 두어 전송 구간 여유를 확보했다. 같은 고비용 통계의 cache revalidation은 60초에서 300초로 완화해 반복 부하와 background timeout 빈도를 낮춘다. 쿼리 rewrite 후보 두 가지는 복구 DB 벤치에서 기존 쿼리보다 느려 적용하지 않았다.

각 응답에는 `Server-Timing: app;dur=...`와 `X-Request-Id`를 추가한다. 이를 이용해 브라우저/network 로그와 Vercel 서버 로그의 같은 요청을 연결할 수 있다.

## Health endpoint

`GET /api/health`는 DB에 `SELECT 1`을 실행한다. 정상일 때 HTTP 200과 DB latency를, 실패할 때 HTTP 503과 `ok: false`만 반환한다. DB 호스트, 연결 문자열, 오류 message 같은 내부 정보는 응답하지 않는다. 응답은 `no-store`이며 별도 rate limit이 있다.

외부 uptime 도구를 연결할 때는 `/api/health`의 HTTP status만 기준으로 감시하고, 과도하게 짧은 polling 주기는 사용하지 않는다.
