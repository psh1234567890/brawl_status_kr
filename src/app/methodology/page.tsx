import type { Metadata } from "next";
import Link from "next/link";
import PortalLayout from "../../components/PortalLayout";

export const metadata: Metadata = {
  title: "데이터 산정 방식",
  description:
    "Brawl Status KR의 검색 표본, 전투 중복 방지, 팀전과 쇼다운 집계, 추천 점수의 한계를 설명합니다.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  return (
    <PortalLayout
      title="데이터 산정 방식"
      eyebrow="Methodology"
      description="추천과 누적 통계가 어떤 전투를 바탕으로 계산되는지, 무엇을 의미하지 않는지 공개합니다."
    >
      <MethodSection title="전체 이용자 공식 통계가 아닙니다">
        <p>
          이 사이트의 DB 통계는 플레이어 태그가 검색될 때 받은 최근 전투를 누적한
          표본입니다. 검색이 많은 지역·실력대·커뮤니티 쪽으로 표본이 치우칠 수 있으며,
          저장된 고유 태그 수는 고유 사용자 수와 다릅니다.
        </p>
      </MethodSection>

      <MethodSection title="최근 최대 25경기를 저장합니다">
        <p>
          공식 전투 기록 응답은 최근 최대 25경기 범위입니다. 같은 태그를 다시 검색하면
          전투 시간과 전투 지문에 걸린 UNIQUE 제약으로 이미 저장된 전투는 건너뜁니다.
          전투 지문은 시간, 모드, 맵, 정렬된 참가자 태그를 사용합니다.
        </p>
      </MethodSection>

      <MethodSection title="팀전과 쇼다운은 다르게 계산합니다">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            일반 2팀 전투는 같은 전투 지문을 한 번만 선택한 뒤 양 팀 참가자를 펼쳐 승리
            팀과 상대 팀의 결과를 계산합니다.
          </li>
          <li>
            듀오·트리오 쇼다운은 여러 팀이 있어도 API가 모든 상대의 개별 결과를 제공하지
            않으므로 검색된 플레이어 관점의 순위만 사용합니다.
          </li>
          <li>친선전은 추천과 누적 승률 통계에서 제외합니다.</li>
        </ul>
      </MethodSection>

      <MethodSection title="표본이 5판 이상일 때만 추천에 표시합니다">
        <p>
          맵·브롤러 조합이 5판 이상일 때 승률과 표본 수를 함께 보여줍니다. 추천 점수는
          표본이 적을수록 승률을 낮춰 반영하는 내부 점수이며, 5판이 대표성을 보장한다는
          뜻은 아닙니다. 화면 값은 최대 60초 캐시될 수 있습니다.
        </p>
      </MethodSection>

      <section className="rounded-lg border border-indigo-100 bg-indigo-50 p-5">
        <h2 className="text-xl font-black text-indigo-950">오류를 발견하셨나요?</h2>
        <p className="mt-2 text-sm font-bold leading-6 text-gray-600">
          맵·모드 번역, 승패, 표본 수가 실제와 다르게 보이면 공개 저장소의 데이터 정확성
          양식으로 알려주세요. 플레이어 태그는 재현에 필요한 경우에도 일부를 가려주세요.
        </p>
        <Link
          href="https://github.com/psh1234567890/brawl_status_kr/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex rounded-lg bg-indigo-700 px-4 py-2 text-sm font-black text-white hover:bg-indigo-800"
        >
          GitHub에서 피드백 남기기
        </Link>
      </section>
    </PortalLayout>
  );
}

function MethodSection({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="rounded-lg border border-white bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-indigo-950">{title}</h2>
      <div className="mt-3 text-sm font-semibold leading-7 text-gray-600">{children}</div>
    </section>
  );
}
