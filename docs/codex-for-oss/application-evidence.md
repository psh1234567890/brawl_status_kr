# Codex for Open Source 신청 근거

이 문서는 신청서 문장과 공개 근거를 연결한다. 2026-09-22에 다시 확인한 공개 `main`, 프로덕션, CI와 상태 페이지를 현재 근거로 취급한다.

| 신청 내용 | 현재 사실 | 공개 또는 로컬 근거 | 상태 |
| --- | --- | --- | --- |
| 저장소 | 공개 GitHub 저장소 | <https://github.com/psh1234567890/brawl_status_kr> | 확인 |
| 라이브 서비스 | 실제 응답하는 한국어 서비스 | <https://www.brawl-o1.site/> | 확인 |
| 역할 | 저장소 소유자, admin/maintain/push 권한 | GitHub API permission | 신청 전 재확인 |
| 프로젝트 가치 | 한국어 전적·보유 현황·검색 표본 기반 추천 | README, 라이브 페이지 | 확인 |
| 사용량 | 60,268 저장 전투, 57,919 고유 전투 지문, 1,606 고유 저장 태그 | 라이브 `/status` 2026-09-22 확인 | 태그≠사용자 |
| 유지보수 | rc.1 이후 다국어·SEO·DB 복구·observability·E2E·CI·release hardening을 지속 병합 | GitHub history, PR #16~#28 | 확인 |
| 테스트 | 로컬 20 files / 67 unit tests와 Playwright E2E 10개 통과 | CI와 로컬 검증 | 확인 |
| CI | 공개 PR과 `main`에서 lint·unit test·audit·build·Chromium E2E 통과 | `.github/workflows/ci.yml`, 최근 main CI | 확인 |
| 데이터 정확성 | 태그 정규화, 지문, UNIQUE, 팀·쇼다운 분리, 격리 복구 DB 저장·중복 방지 검증 | 코드, `DATA_METHODOLOGY.md`, `DATABASE_BACKUP.md` | 확인 |
| 보안 | 비밀정보 감사, 신고 절차, 보안 headers, 무인증 삭제·묵시적 프록시 제거, 현재 audit 0 | `security-audit.md`, `SECURITY.md`, CI | 확인 |
| 외부 피드백 | 공개 외부 피드백 근거가 아직 부족함 | GitHub/운영 기록 | 실제 축적 필요 |
| 외부 기여자 | 현재 0 | GitHub contributors | 과장 금지 |
| 라이선스 | 공개 `main`에 MIT와 적용 범위 기록 | `LICENSE`, `license-recommendation.md`, PR #1 | 확인 |
| API 크레딧 계획 | 이슈·PR·릴리스·문서 유지보수 | `application-drafts.md` | 계획 |

## 주장하면 안 되는 문장

- 국내 대표 Brawl Stars 통계 서비스
- 전 세계 또는 아시아 전체 이용자 통계
- 1,606명의 사용자
- 널리 사용되는 프로젝트
- 활발한 외부 기여 생태계

## 신청 시점

기술·운영 근거는 첫 정식 릴리스 수준까지 갖췄지만, Codex for Open Source 신청 판단은 제품 릴리스와 별개다. 실제 외부 피드백·기여와 지속적인 사용 근거를 더 축적한 뒤 제출 직전에 공식 자격 요건과 최신 지표를 다시 확인한다.
