# Netlify 전환 안전 게이트 (2026-11-24)

> 이 문서는 **준비·검증 절차**다. 작성이나 Draft PR 병합이 운영 DNS
> 변경·계정 활성화·권한 확대를 승인하는 것은 아니다.

## 현재 확인된 상태

| 항목 | 확인 결과 |
| --- | --- |
| 기존 Vercel 운영 | `www.brawl-o1.site` HTTP 200, `main` 변경 없음 |
| Netlify Preview #140 | 비공개 접근 보호, 읽기 전용 DB·기존 게시글·메타·외부 API 조회 성공 |
| 커뮤니티 이미지 | 기존 공개 첨부 1개를 Netlify Blob에서 읽음, Vercel 원본과 해시 일치 |
| Blob 저장소 | 임시 객체의 생성·읽기·해시·삭제 성공 |
| 계정 로그인 | Preview의 `ACCOUNTS_MODE=off`가 정상 차단, 운영 Google OAuth **미검증** |
| 계정 쓰기 | 운영 Supabase 연결용 역할은 `default_transaction_read_only=on`; 실제 쓰기 **미검증** |
| 롤백 이중 저장 | 코드/CI만 검증; 실제 Vercel Blob 토큰을 이용한 외부 쓰기 **미검증** |

## 게이트 A: 현재 안전한 읽기 전용 Preview

- `codex/netlify-db-preview-20261124` → Draft PR #140 → Netlify Deploy Preview.
- 운영용 `main`, Vercel 환경 변수, 공개 도메인/DNS, 기존 DB 데이터는 변경하지 않는다.
- `ACCOUNTS_MODE=off`, `ACCOUNT_SYNC_ENABLED=0`, `NEXT_PUBLIC_BRAWLOOP_STAGING=1`,
  `BRAWLOOP_NETLIFY_PRODUCTION=0`, `NETLIFY_ACCOUNT_MAINTENANCE=0`을 유지한다.
- Preview에서 실사용자 Google 로그인, 게시글 작성, DB 쓰기 테스트를 시도하지 않는다.
- 비밀값은 Netlify의 보호된 환경 변수에만 보관하고 로그/PR/채팅으로 꺼내지 않는다.

## 게이트 B: 이미지 롤백 보장

저장소 기본 경로는 배포별로 다르다.

- 기존 Vercel 운영: Vercel **private Blob** 저장소.
- 신규 Netlify: `COMMUNITY_IMAGE_STORAGE=netlify`면 Netlify Blob 저장소.
- 신규 이미지가 Netlify에만 있으면 Vercel로 롤백할 때 이미지가 사라져 보인다.

이번 코드에는 명시적인 이중 저장 모드가 있다.

| 환경 변수 | Netlify에서의 의미 |
| --- | --- |
| `COMMUNITY_IMAGE_STORAGE=netlify` | Netlify Blob을 기본 저장소로 사용 |
| `COMMUNITY_IMAGE_ROLLBACK_MIRROR=vercel` | 업로드 시 Vercel private Blob에도 동일 경로의 사본 생성 |
| `BLOB_READ_WRITE_TOKEN` | **서버 함수 전용 비밀값**. 기존 Vercel private Blob 저장소의 읽기·쓰기 권한 |

- 미러가 활성화되면 **Netlify 저장 성공 + Vercel 저장 성공** 이후에만 업로드가 성공한다.
- 미러용 토큰이 없으면 저장 전 503으로 실패하며, 미러 실패 시 Netlify 사본 삭제를
  시도하고 DB의 객체 정리 목록은 남겨 재시도할 수 있게 한다.
- 삭제·유지보수 중에는 양쪽 저장소를 모두 삭제한 뒤에만 객체 정리 목록을 제거한다.
- Netlify의 production 컨텍스트 또는 `BRAWLOOP_NETLIFY_PRODUCTION=1`에서는
  미러 설정 없이 **새 이미지 업로드를 차단**한다.
- 미러를 끄거나 Vercel 저장소를 제거하기 전, 롤백 기간과 양쪽 객체의 상태를 확인해야 한다.
- Vercel 운영으로 롤백한 기간에 생성된 새 이미지는 Netlify로 재전환하기 전에
  **다시 Netlify Blob으로 증분 복사·검증**해야 한다.
- 이중 저장에는 두 서비스의 저장·요청 사용량이 발생한다. 무료 사용량과 예산을
  확인하지 않고 운영 설정을 켜지 않는다.

**운영 활성화 전 필수 실제 검증:** 운영자가 Vercel의 기존 저장소와 정확히 연결된
토큰을 Netlify의 비밀 변수로 직접 등록한 뒤, 별도 승인된 작은 **합성 이미지**
1개를 이중 저장 → 양쪽에서 해시 검증 → 양쪽에서 삭제한다. 사용자 게시글/
기존 이미지를 시험용으로 삭제·수정하지 않는다.

## 게이트 C: 회원·Google OAuth·DB 쓰기

1. DB 쓰기 전용 최소 권한 역할/연결 정책을 별도로 설계한다. 현재 읽기 전용
   `brawl_netlify_runtime` 역할을 무단으로 승격하거나 `read_only`를 해제하지 않는다.
2. 기존 사용자 UUID와 인증 테이블·세션·삭제 ledger·RLS를 유지하며
   **운영 데이터가 아닌 격리 DB에서** 생성·수정·삭제·롤백을 먼저 시험한다.
3. Netlify 비밀 변수에 `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `ACCOUNT_RATE_LIMIT_SECRET`,
   `ACCOUNT_DELETION_MANIFEST_SECRET` 등 필수 값을 승인받아 입력한다.
   `BETTER_AUTH_URL`과 `ACCOUNT_TRUSTED_ORIGINS`는 정확한 **HTTPS origin**으로
   관리하고 와일드카드는 사용하지 않는다.
4. 실제 운영 콜백은 `https://www.brawl-o1.site/api/auth/callback/google`.
   Preview를 운영 Google OAuth 클라이언트에 무단으로 연결하지 않는다.
5. 계정 자격·약관/개인정보 안내·10개 언어 정책·백업 보존·삭제 manifest 및
   독립 키 복구/외부 보관을 `docs/ACCOUNT_RELEASE_READINESS.md`에 따라 검증한다.
6. **현재 계정 수가 0이 아니다.** 로그인 차단을 실제 운영으로 넘기지 않도록
   검증 결과를 확인한 뒤 별도 승인으로 점진적 활성화한다.
7. 백업·복구·삭제 전용 OAuth와 문의 경로를 확보하지 못하면 계정 롤아웃을 보류한다.

## 게이트 D: 최종 운영 전환 및 되돌리기

1. 최신 CI 전체 통과, Netlify 프라이빗 기능·인증·블롭 이중 저장 검증,
   실제 API/DB 읽기와 쓰기, 비용·크레딧/쿼터 점검.
2. 운영자는 **전환 직전 시점의 계정 백업과 삭제 manifest 복구를 별도 검증**한다.
3. 최초 전환 직전에도 Vercel 롤백용 배포/Blob/인증 설정을 유지한다.
4. `netlify.toml`은 현재 의도적으로 모든 환경을 staging/off로 고정한다.
   Netlify 대시보드에서 값을 바꾸기만 해서는 운영 활성화가 보장되지 않는다.
   `NEXT_PUBLIC_BRAWLOOP_STAGING`·`BRAWLOOP_NETLIFY_PRODUCTION` 변경은
   **별도 코드 검토 및 명시적 운영 승인** 이후에만 진행한다.
5. 그 후에만 DNS·도메인 전환. 전환 후에는 Google callback/세션/커뮤니티/
   이미지·로테이션·전적/캐시/Cloudflare/비용을 모니터링한다.
6. 장애 시 신규 쓰기와 계정 동기화를 중지하고, Vercel로 되돌린 후
   이미지 미러 및 삭제 이력·DB 일관성을 확인한다. 운영 회원 DB를
   과거 snapshot으로 통째로 되돌리지 않는다.

### 변경 금지·주의

- 이번 Draft PR을 `main`에 병합하지 않는다.
- 현재 Supabase 사용자·회원 데이터를 수정하거나 권한을 확대하지 않는다.
- Vercel/Netlify 비밀값을 추출·로그·채팅으로 전달하지 않는다.
- DNS·운영 도메인·유료 플랜을 사용자 승인 없이 변경하지 않는다.
