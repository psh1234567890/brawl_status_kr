# 수동 DB 백업과 복구 계획

2026-09-21부터는 로컬 PostgreSQL 설치가 없어도 Docker Desktop과 공식 `postgres:<server-major>-alpine` 이미지의 `pg_dump`/`pg_restore`를 이용하는 helper를 제공한다. 운영 DB에는 읽기 전용 조회와 `pg_dump`만 수행하고, 복구 연습은 별도 임시 PostgreSQL 컨테이너에서 수행한다. 운영 DB/RLS는 변경하지 않는다.

2026-09-21 실제 복구 연습에서는 PostgreSQL 17 운영 DB의 `public` 스키마를 custom archive로 백업한 뒤 별도 PostgreSQL 17 임시 DB에 복구했다. `battle_logs` 60,229행, archive가 보존한 인덱스 8개, fingerprint/timestamp/JSON 누락 수, RLS ON 및 FORCE RLS OFF가 원본 manifest와 일치함을 확인했다.

2026-09-22에는 새 운영 읽기 전용 백업(60,268행)을 다시 만들고 별도 PostgreSQL 17 DB에 복구한 뒤, 실제 production build를 그 복구 DB와 로컬 HTTPS mock upstream에 연결해 저장 흐름을 검증했다. 합성 태그의 battlelog 1건을 `POST /api/player/matches`로 저장했을 때 row 수가 60,268→60,269로 1행 증가했고 fingerprint/timestamp/JSON이 모두 생성됐다. 같은 요청을 두 번째로 실행했을 때 row 수가 그대로 60,269여서 UNIQUE + `ON CONFLICT DO NOTHING` 중복 방지가 실제 라우트에서도 동작함을 확인했다. 테스트 컨테이너와 임시 TLS 인증서는 검증 후 삭제했으며 운영 DB에는 이 과정에서 쓰기 작업을 하지 않았다.

## 준비

- 기본 helper 사용 시 Docker Desktop을 실행한다. helper는 운영 서버 major와 같은 공식 `postgres:<major>-alpine` 이미지를 사용한다. 수동 방식은 PostgreSQL 공식 클라이언트(pg_dump, pg_restore)를 별도로 설치해도 된다.
- Supabase 대시보드에서 서버 버전과 직접 연결 또는 session pooler 연결을 확인한다. transaction pooler는 백업 연결로 사용하지 않는다.
- 연결 정보는 로컬 PostgreSQL service 파일 및 비밀번호 파일에 저장하고 현재 사용자만 읽도록 권한을 제한한다. 서비스 이름은 `brawl_backup`으로 정한다. 암호나 연결 URL을 명령행, 로그, Git에 넣지 않는다.
- 백업 목적지는 저장소 밖의 접근 제한 폴더로 정한다. `.gitignore`에도 `/backups/`, `*.dump`, `*.backup`을 제외했다. SQL 내보내기 역시 저장소 밖에 둔다.

## 수동 실행 예시

아래는 연결 서비스 설정과 클라이언트 설치를 마친 뒤 실행하는 예시다. 파일명은 매번 고유하게 지정하고 기존 백업을 덮어쓰지 않는다.

```powershell
pg_dump --version
pg_dump --dbname=service=brawl_backup --format=custom --schema=public --no-password --file="C:\PrivateBackups\brawl-YYYYMMDD-HHMMSS.dump"
if ($LASTEXITCODE -ne 0) { throw '백업 실패: 생성된 파일을 정상 백업으로 사용하지 마세요.' }
pg_restore --list "C:\PrivateBackups\brawl-YYYYMMDD-HHMMSS.dump"
if ($LASTEXITCODE -ne 0) { throw '백업 목록 검사 실패' }
Get-FileHash -Algorithm SHA256 "C:\PrivateBackups\brawl-YYYYMMDD-HHMMSS.dump"
```

## 프로젝트 helper

`.env.local`의 `DIRECT_URL`을 우선 사용하고, 비밀번호는 명령행이나 로그로 출력하지 않는다. helper는 임시 libpq service/password 파일을 사용자 임시 폴더에 만들고 실행 직후 삭제한다. 백업은 저장소 밖 `%LOCALAPPDATA%\BrawlStatusKR\backups`에 저장되며, archive와 함께 SHA-256·원본 row 수·인덱스·RLS 상태가 담긴 manifest JSON을 만든다.

```powershell
npm.cmd run db:backup
npm.cmd run db:restore:test -- --backup "C:\...\brawl-YYYYMMDDTHHMMSSZ.dump"
```

복구 테스트는 localhost에만 임시 포트를 열고 별도 `brawl_restore_test` DB에 restore한 뒤 `battle_logs` row 수, 필수 인덱스, fingerprint/timestamp/JSON 누락 수, RLS/ FORCE RLS 상태를 원본 manifest와 비교한다. 검증 종료 후 컨테이너는 삭제한다.

이 범위는 앱의 public 스키마와 데이터다. Supabase 전체 프로젝트 백업이 아니며 Auth, Storage 파일, 외부 스키마 의존성, 프로젝트 설정, 역할은 별도다. 목록 검사와 해시만으로 복구 가능성이 증명되지는 않는다. 성공 파일은 암호화된 별도 저장소에도 보관하고 정기적으로 복구 연습한다.

## 계정 데이터 주의사항

계정 테이블은 `public` 스키마에 있으므로 기존 public schema dump에는 이메일,
Google subject, 세션, 사용자 프로필, personal best가 포함될 수 있다. 계정을
활성화하기 전 저장소 밖 암호화·접근 제한·보존·복구 권한을 정해야 한다.

계정 삭제는 public tombstone과 함께 public dump에 포함되지 않는
`account_safety.deletion_ledger`에도 기록된다. backup helper는 활성 safety ledger를
HMAC 서명된 `<archive>.deletions.json`으로 내보내고
`account-deletions-latest.json`도 원자적으로 갱신한다. standalone export는 다음과 같다.

```powershell
npm.cmd run db:deletions:export
```

`ACCOUNT_BACKUP_RETENTION_DAYS`, `ACCOUNT_DELETION_MANIFEST_RETENTION_DAYS`,
`ACCOUNT_DELETION_MANIFEST_SECRET`, `ACCOUNT_DELETION_EXPORT_DATABASE_URL`이
필요하며 export helper는 `DATABASE_URL`/`DIRECT_URL`로 fallback하지 않는다.
deletion manifest 보존 일수는 backup
보존 일수보다 길어야 한다. timestamped backup/manifest 정리는 먼저 dry-run으로
확인한다.

```powershell
npm.cmd run db:backup:prune
npm.cmd run db:backup:prune -- --apply
```

계정 기능을 켜기 전에는 계정 전용 runner로 `0003_account_mvp`와
`0004_account_pb_ruleset_v1`을 격리 PostgreSQL에 적용하고, 신규 테이블/제약/RLS와
사용자 cascade 및 restore 흐름을 확인한다. `0004`는 version 1이 아닌 PB 행을
자동으로 바꾸거나 삭제하지 않고 적용을 중단하므로, 해당 행이 발견되면 먼저
격리 환경에서 원인을 검토한다. `0005`는 public dump 밖의
`account_safety.deletion_ledger`를 만든다. public-schema restore 뒤 ledger object가
없는 경우 계정 migration runner가 checksum을 검증한 뒤 idempotent하게 다시 만든다.
기존 `scripts/migrate-db.mjs`는 battle cleanup/backfill을 포함하므로 계정 migration
테스트나 적용에 사용하지 않는다.

## 복구 연습

1. 운영과 분리된 비어 있는 PostgreSQL 테스트 DB를 준비한다. 필요한 확장과 역할, 스키마 의존성을 확인한다.
2. 복구 전용 service `brawl_restore_test`가 운영 호스트를 가리키지 않는지 직접 확인한다.
3. 다음을 실행한다. 기존 데이터 삭제 옵션은 사용하지 않는다.

```powershell
pg_restore --dbname=service=brawl_restore_test --no-owner --no-privileges --exit-on-error --single-transaction --no-password "C:\PrivateBackups\brawl-YYYYMMDD-HHMMSS.dump"
if ($LASTEXITCODE -ne 0) { throw '복구 연습 실패' }
```

4. 복구 DB의 row 수, fingerprint/timestamp/JSON 누락, unique/index, RLS ON 및 FORCE RLS OFF를 확인한다. `--no-privileges`를 사용하므로 운영 권한 복제 완료로 간주하지 않는다. 앱 역할과 anon 접근 제한을 별도로 검증한다.
5. 계정 데이터가 들어 있는 복구라면 `npm run db:migrate:accounts`로 non-public safety
   ledger를 보장한 뒤, **복구하려는 archive보다 최신인** 신뢰 가능한 deletion
   manifest를 지정해 재적용한다. archive와 같이 만들어진 manifest만 쓰면 그 backup
   이후 발생한 삭제는 반영할 수 없으므로 운영 복구에는 가장 최신의 외부 보관본을 쓴다.

```powershell
$env:ACCOUNT_RESTORE_DATABASE_URL='postgresql://.../restore_target'
npm.cmd run db:deletions:reapply -- --manifest "C:\PrivateBackups\account-deletions-latest.json"
```

6. 테스트 앱을 복구 DB에 연결해 통계 API와 기록 조회를 검증한다. 운영 복구는 별도 승인과 복구 시점/손실 범위 확인 후 진행한다.

## 향후 helper 설계

`scripts/backup-db.mjs`는 Docker/클라이언트 버전을 확인하고, 임시 libpq service/password 파일을 사용한다. 저장소 외부 경로만 허용하고 고유 `.partial` 파일에 기록한 뒤 archive 목록 검사와 SHA-256 계산이 성공해야 최종 이름으로 바꾼다. 자식 프로세스 실패 시 원문 stderr를 그대로 출력하지 않아 연결 정보가 로그에 섞이는 것을 피한다.

## 계정 전용 암호화 외부 보관

2026-09-28 운영자가 백업 7일·삭제 manifest 14일을 선택했다. 이는 보존 설정값이며
자동 작업이 이미 실행 중이라는 뜻은 아니다. `ACCOUNT_RELEASE_READINESS.md`와
`ACCOUNT_LAUNCH_POLICY.json`을 함께 확인한다.

`npm run db:accounts:snapshot -- backup`은 명시적인
`ACCOUNT_SNAPSHOT_DATABASE_URL`만 사용하며 `.env.local`, `DATABASE_URL`, `DIRECT_URL`을
읽지 않는다. 9개 계정 테이블만 custom dump로 내보낸 뒤 AES-256-GCM으로 암호화한다.
`students`, battle 테이블, non-public safety ledger의 원본 dump는 포함하지 않는다.
최신 safety ledger는 HMAC 서명 manifest로 따로 내보내고 별도로 암호화한다.
`npm run db:accounts:snapshot -- manifest`는 ledger만 내보낸다.
별도 임시 폴더의 원문 dump/manifest는 실행 후 삭제되며, 업로드 대상은 `.enc`뿐이다.
대상 프로젝트·5432 session pooler·TLS CA/hostname을 검사하고, 원격 production은
추가 `ACCOUNT_SNAPSHOT_ALLOW_PRODUCTION=1` 없이는 거부한다. Docker 도구를 쓰는
Linux runner에서는 원본 PostgreSQL major와 같은 공식 이미지를 사용한다.

`.github/workflows/account-snapshots.yml`은 main에서만 실행하고 기본 비활성이다.
repo 변수 `ACCOUNT_SNAPSHOT_AUTOMATION_ENABLED=1`과 환경별
`account-operations-staging`/`account-operations-production`의
`ACCOUNT_SNAPSHOT_ENABLED=1`이 모두 있어야 실행한다. environment별 target ref,
별도 읽기 DB URL, CA, AES key, 앱과 일치하는 manifest HMAC secret을 설정한다.
시간당 manifest, 하루 1회 backup을 GitHub artifact로 각각 14일/7일 보관하도록
구성했다. 공개 repo이므로 raw dump/manifest나 키는 절대 artifact로 업로드하지 않는다.
재-export로 삭제 UUID의 보존 시계가 다시 시작되지 않도록 artifact 이름에는 해당
manifest에서 가장 먼저 만료되는 삭제 표식의 원래 만료 시각을 넣는다. 예약 작업은
그 시각이 지난 계정 artifact만 환경별로 제거한다. backup도 생성 시점의 7일 기한을
사용한다. 정리 지연/실패로 물리 보관이 더 길어질 수 있으므로 만료 보관본은 복구에
사용하지 않고 정리 실패를 감시한다. 이 cleanup에만 GitHub Actions artifact 삭제
권한을 사용하며, 다른 이름의 CI artifact는 삭제 대상이 아니다.
암호화 키와 서명키는 artifact·DB backup과 별도의 접근 제한 복구 경로에 보관한다.
GitHub 보존 설정은 다운로드한 별도 사본이나 Supabase 관리형 backup의 보존 설정을
바꾸지 않으므로 그 보관본도 각각 목록화하고 정책에 맞춰 설정·정리한다.

예약 실행은 지연/실패할 수 있다. 현재 hourly export는 삭제 transaction마다 즉시
외부 사본을 만드는 시스템이 아니며, 장애 시 마지막 성공 export 이후의 삭제가 누락될
수 있다. 복구 전에 남아 있는 최신 safety ledger에서 즉시 export하고, 원본 유실 시에는
독립 최신 ledger/manifest로 삭제 누락이 없음을 확인해야 한다. 확인할 수 없으면
복구 DB의 계정 기능을 열지 않는다. 이전 archive 옆의 manifest만으로 복구를 승인하지 않는다.

외부 보관본을 내려받은 뒤 key와 명시적인 target/project ref를 안전하게 환경에 전달한다.
원문 출력 경로는 저장소 밖의 접근 제한 폴더여야 한다.

```powershell
npm.cmd run db:accounts:decrypt -- "C:\PrivateBackups\accounts.dump.enc" "C:\PrivateRestore\accounts.dump" backup
npm.cmd run db:accounts:decrypt -- "C:\PrivateBackups\latest.json.enc" "C:\PrivateRestore\latest.json" manifest
```

복구는 운영과 분리된 빈 DB에서 먼저 연습한다. `pg_restore --no-owner --no-privileges
--exit-on-error --single-transaction`으로 archive를 적용하고, 계정 전용 migration runner로
non-public ledger와 checksum을 확인한 다음 최신 manifest를 재적용한다.
`db:deletions:reapply`와 `db:restore:test`는 복구된 모든 세션과 OAuth state/삭제 proof를
manifest 재적용 transaction에서 폐기한다. 살아 있는 계정도 새로 로그인해야 한다.
권한/RLS를 재검증하고 삭제 UUID가 제거됐음을 확인한 뒤에만 앱을 연결한다.
원문 복구 파일은 연습 종료 후 제거하고, 7/14일 만료와 외부 보관본 정리를 실제로
확인한다. 코드/CI 테스트를 외부 보관 작업의 활성화나 운영 복구 성공으로 표현하지 않는다.

## 공식 문서

- https://supabase.com/docs/guides/platform/backups
- https://www.postgresql.org/docs/current/app-pgdump.html
- https://www.postgresql.org/docs/current/app-pgrestore.html
- https://www.postgresql.org/docs/current/libpq-pgservice.html
- https://www.postgresql.org/docs/current/libpq-pgpass.html
