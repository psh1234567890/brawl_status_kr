# Codex for Open Source 신청 근거

이 문서는 신청서 문장과 공개 근거를 연결한다. 로컬 후보 브랜치의 파일은 push되기 전까지 공개 근거가 아니다.

| 신청 내용 | 현재 사실 | 공개 또는 로컬 근거 | 상태 |
| --- | --- | --- | --- |
| 저장소 | 공개 GitHub 저장소 | <https://github.com/psh1234567890/brawl_status_kr> | 확인 |
| 라이브 서비스 | 실제 응답하는 한국어 서비스 | <https://www.brawl-o1.site/> | 확인 |
| 역할 | 저장소 소유자, admin/maintain/push 권한 | GitHub API permission | 신청 전 재확인 |
| 프로젝트 가치 | 한국어 전적·보유 현황·검색 표본 기반 추천 | README, 라이브 페이지 | 확인 |
| 사용량 | 5,864 저장 전투, 130 고유 저장 태그 | `/status`, `evidence-log.md` | 태그≠사용자 |
| 유지보수 | 공개 50 commits, 최근 공개 push 2026-07-04 | GitHub history | 최근 활동 추가 필요 |
| 테스트 | 로컬 6 files, 19 tests 통과 | `verification.md` | 공개 CI 필요 |
| CI | 후보 workflow 작성 | `.github/workflows/ci.yml` | push 후 확인 |
| 데이터 정확성 | 태그 정규화, 지문, UNIQUE, 팀·쇼다운 분리 | 코드와 `DATA_METHODOLOGY.md` | 추가 fixture 권장 |
| 보안 | 비밀정보 감사, 신고 절차, 보안 headers | `security-audit.md`, `SECURITY.md` | P1 결정 필요 |
| 외부 피드백 | 현재 0 | GitHub issue/PR | 4~6주 실제 축적 필요 |
| 외부 기여자 | 현재 0 | GitHub contributors | 과장 금지 |
| 라이선스 | 로컬 후보에 MIT와 적용 범위 기록 | `LICENSE`, `license-recommendation.md` | 공개 브랜치 반영 필요 |
| API 크레딧 계획 | 이슈·PR·릴리스·문서 유지보수 | `application-drafts.md` | 계획 |

## 주장하면 안 되는 문장

- 국내 대표 Brawl Stars 통계 서비스
- 전 세계 또는 아시아 전체 이용자 통계
- 130명의 사용자
- 널리 사용되는 프로젝트
- 활발한 외부 기여 생태계
- CI와 라이선스가 이미 공개됐다는 주장

## 신청 시점

현재는 C. 아직 신청하면 안 됨이다. 최소한 라이선스, 공개 CI, 첫 릴리스, 최근 사용량 측정, 실제 외부 피드백과 유지보수 기록을 확보한 뒤 다시 판단한다.
