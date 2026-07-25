# 최종 로컬 검증 기록

- 검증일: 2026-07-25
- 작업 위치: `C:\Users\ADMIN\Desktop\brawl_status_kr_oss`
- 브랜치: `codex/oss-readiness`
- 검증 대상: GitHub draft PR #1의 공개 후보 브랜치

## 자동 검증

| 검사 | 결과 |
| --- | --- |
| `npm.cmd run lint` | 통과 |
| `npm.cmd test -- --run` | 7개 파일, 23개 테스트 통과 |
| `npm.cmd run build` | Next.js 16.2.11 프로덕션 빌드 통과 |
| 정적 페이지 생성 | 32개 경로 처리 완료 |
| `/status` | 요청 시 서버 렌더링되는 동적 경로로 확인 |
| `DELETE /api/player/history` | 공개 핸들러 제거 후 HTTP 405 확인 |
| API 연결 설정 | 명시적 HTTPS 주소만 허용하는 4개 경계 테스트 통과 |
| GitHub Actions `verify` | PR #1의 두 번째 원격 실행 통과 |
| Vercel Preview | PR #1 배포 통과, 읽기 API HTTP 200 확인 |
| Vercel API 주소 | Production·Preview에 명시적 HTTPS 프록시 설정 등록, 다음 Preview에서 재검증 예정 |
| Markdown 로컬 링크 | 26개 Markdown 파일, 깨진 링크 0개 |
| GitHub YAML 파싱 | 6개 파일 통과 |
| `git diff --check` | 오류 없음 |
| 작업 트리 비밀정보 패턴 검사 | 실제 비밀정보 없음 |
| 전체 Git 기록 비밀정보 패턴 검사 | 실제 비밀정보 없음 |

비밀정보 패턴 검사가 찾은 `docs/SELF_HOSTING.md`의 두 URL은
`USER:PASSWORD@HOST` 형식의 명시적 예시 자리표시자다.

## 렌더링 검증

로컬 프로덕션 서버(`next start`)를 브라우저에서 직접 확인했다.

- 데스크톱 1440×900: 홈 제목·검색 화면·방법론 링크·비공식 팬 콘텐츠 고지 표시
- 링크 이동: 홈의 `데이터 산정 방식`에서 `/methodology`로 정상 이동
- 방법론: 제목과 5개 설명 섹션 표시
- 모바일 390×844: 검색 카드·입력·버튼이 가용 폭에 맞게 배치
- 모바일 가로 넘침: 없음(`scrollWidth`와 `clientWidth`가 동일)
- 위 세 시나리오의 브라우저 경고·오류: 0

스크린샷:

- `docs/assets/home-desktop.png`
- `docs/assets/home-mobile.png`
- `docs/assets/methodology-desktop.png`

## 남아 있는 의도적 미검증

- 운영 DB에 쓰는 `POST /api/player/matches`
- 운영 DB 기록 요청의 실제 운영자 검토 절차
- GitHub Actions의 실제 원격 실행
- 배포 후 canonical 도메인의 새 화면

위 항목은 운영 데이터 변경 또는 외부 공개 변경이므로 사용자 승인 없이 실행하지 않았다.

## 의존성 감사

`npm audit`은 critical 0, high 11을 보고한다. 현재 npm의 자동 수정 제안은
ESLint 메이저 변경 또는 Next.js 다운그레이드처럼 호환성 위험이 있는 변경을 포함한다.
따라서 `--force` 수정은 적용하지 않았고, 공개 전 별도 호환성 검토 대상으로 남겼다.
