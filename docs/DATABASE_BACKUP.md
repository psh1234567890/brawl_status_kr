# 수동 DB 백업과 복구 계획

2026-09-18 점검: PATH와 Windows 기본 PostgreSQL 설치 폴더에서 pg_dump를 찾지 못했다. 실제 백업 및 복구는 실행하지 않았다. Docker 설정과 운영 DB/RLS는 변경하지 않는다.

## 준비

- PostgreSQL 공식 배포판의 클라이언트 도구(pg_dump, pg_restore)를 설치한다. 서버 major 버전 이상인 pg_dump를 사용한다. Docker는 필요하지 않다.
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

`scripts/backup-db.mjs`를 구현할 경우 실행 파일과 버전을 먼저 확인하고, 연결은 libpq service/보호된 password 파일로 전달한다. 저장소 외부 경로만 허용하고 고유 `.partial` 파일에 기록한 뒤 성공 및 목록 검증 후 이름을 바꾼다. 자식 프로세스 오류에 연결 정보가 섞일 수 있으므로 원문을 무조건 출력하지 않는다. 현재는 미설치 상태라 실제 dump/restore 검증 없이 helper를 제공하지 않았다.

## 공식 문서

- https://supabase.com/docs/guides/platform/backups
- https://www.postgresql.org/docs/current/app-pgdump.html
- https://www.postgresql.org/docs/current/app-pgrestore.html
- https://www.postgresql.org/docs/current/libpq-pgservice.html
- https://www.postgresql.org/docs/current/libpq-pgpass.html
