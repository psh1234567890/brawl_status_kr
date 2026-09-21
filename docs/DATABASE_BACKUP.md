# 수동 DB 백업과 복구 계획

2026-09-21부터는 로컬 PostgreSQL 설치가 없어도 Docker Desktop과 공식 `postgres:<server-major>-alpine` 이미지의 `pg_dump`/`pg_restore`를 이용하는 helper를 제공한다. 운영 DB에는 읽기 전용 조회와 `pg_dump`만 수행하고, 복구 연습은 별도 임시 PostgreSQL 컨테이너에서 수행한다. 운영 DB/RLS는 변경하지 않는다.

2026-09-21 실제 복구 연습에서는 PostgreSQL 17 운영 DB의 `public` 스키마를 custom archive로 백업한 뒤 별도 PostgreSQL 17 임시 DB에 복구했다. `battle_logs` 60,229행, archive가 보존한 인덱스 8개, fingerprint/timestamp/JSON 누락 수, RLS ON 및 FORCE RLS OFF가 원본 manifest와 일치함을 확인했다.

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

## 복구 연습

1. 운영과 분리된 비어 있는 PostgreSQL 테스트 DB를 준비한다. 필요한 확장과 역할, 스키마 의존성을 확인한다.
2. 복구 전용 service `brawl_restore_test`가 운영 호스트를 가리키지 않는지 직접 확인한다.
3. 다음을 실행한다. 기존 데이터 삭제 옵션은 사용하지 않는다.

```powershell
pg_restore --dbname=service=brawl_restore_test --no-owner --no-privileges --exit-on-error --single-transaction --no-password "C:\PrivateBackups\brawl-YYYYMMDD-HHMMSS.dump"
if ($LASTEXITCODE -ne 0) { throw '복구 연습 실패' }
```

4. 복구 DB의 row 수, fingerprint/timestamp/JSON 누락, unique/index, RLS ON 및 FORCE RLS OFF를 확인한다. `--no-privileges`를 사용하므로 운영 권한 복제 완료로 간주하지 않는다. 앱 역할과 anon 접근 제한을 별도로 검증한다.
5. 테스트 앱을 복구 DB에 연결해 통계 API와 기록 조회를 검증한다. 운영 복구는 별도 승인과 복구 시점/손실 범위 확인 후 진행한다.

## 향후 helper 설계

`scripts/backup-db.mjs`는 Docker/클라이언트 버전을 확인하고, 임시 libpq service/password 파일을 사용한다. 저장소 외부 경로만 허용하고 고유 `.partial` 파일에 기록한 뒤 archive 목록 검사와 SHA-256 계산이 성공해야 최종 이름으로 바꾼다. 자식 프로세스 실패 시 원문 stderr를 그대로 출력하지 않아 연결 정보가 로그에 섞이는 것을 피한다.

## 공식 문서

- https://supabase.com/docs/guides/platform/backups
- https://www.postgresql.org/docs/current/app-pgdump.html
- https://www.postgresql.org/docs/current/app-pgrestore.html
- https://www.postgresql.org/docs/current/libpq-pgservice.html
- https://www.postgresql.org/docs/current/libpq-pgpass.html
