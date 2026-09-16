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

`BRAWL_STARS_API_BASE_URL`에는 인증정보가 포함되지 않은 HTTPS URL을 반드시 명시해야 합니다. 묵시적 기본 프록시는 없습니다. 공식 API를 직접 사용하면 배포 환경의 고정 IP 허용 조건을 확인하고, 프록시를 사용하면 해당 운영자·로그·보관·키 회전 정책을 먼저 신뢰할 수 있어야 합니다.

## 데이터베이스

새 DB와 백업을 먼저 준비한 뒤 마이그레이션을 실행합니다.

```powershell
npm.cmd run db:migrate
npm.cmd run db:check
```

마이그레이션은 컬럼과 기본 조회 인덱스를 준비한 뒤 기존 태그 정규화·중복 제거·전투 지문 backfill을 작은 배치로 수행합니다. backfill 뒤 fingerprint·timestamp·전투 JSON GIN 인덱스와 UNIQUE 인덱스를 생성하므로 대량 legacy UPDATE 중 불필요한 인덱스 갱신을 줄입니다. 이미 backfill된 행은 재실행 때 건너뜁니다. 운영 DB에서 실행하기 전에 SQL과 백업·복구 절차를 검토하세요.

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
