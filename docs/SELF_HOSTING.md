# 직접 실행하기

## 요구 사항

- Node.js 20 이상
- npm
- PostgreSQL
- Brawl Stars Developer API에서 발급한 키

## 설치

```powershell
git clone https://github.com/psh1234567890/brawl_status_kr.git
cd brawl_status_kr
Copy-Item .env.example .env.local
npm.cmd ci
```

`.env.local`에 본인의 개발용 값을 넣습니다.

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
BRAWL_STARS_API_KEY=YOUR_KEY
BRAWL_STARS_API_BASE_URL=https://YOUR_TRUSTED_PROXY.example/v1
```

`BRAWL_STARS_API_BASE_URL`을 비워 두면 현재 구현은 `https://bsproxy.royaleapi.dev/v1`을 사용합니다. 이 경우 API 키가 프록시로 전달됩니다. 운영 환경에서는 직접 관리하거나 명시적으로 신뢰한 프록시만 사용하세요.

## 데이터베이스

새 DB와 백업을 먼저 준비한 뒤 마이그레이션을 실행합니다.

```powershell
npm.cmd run db:migrate
npm.cmd run db:check
```

마이그레이션은 컬럼과 인덱스를 추가하고 기존 전투 행을 보정합니다. 운영 DB에서 실행하기 전에 SQL과 백업·복구 절차를 검토하세요.

## 실행과 검증

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run start
```

CI는 API 키와 DB 없이 lint·test·build를 실행합니다. DB 연동 테스트와 실제 API 테스트는 별도의 승인된 환경에서 수행해야 합니다.

## 배포 점검

- canonical host, robots, sitemap이 실제 도메인을 가리키는지 확인
- API 키가 브라우저 번들 또는 로그에 노출되지 않는지 확인
- DB 계정은 필요한 최소 권한만 부여
- 프록시 신뢰 관계와 키 회전 절차 확인
- 개인정보·쿠키·분석 도구 설명을 실제 설정과 일치시킴
- Supercell의 최신 Fan Content Policy 고지 유지
