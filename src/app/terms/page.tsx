import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용 안내",
  description:
    "Brawl Status KR 이용 시 알아야 할 데이터 기준, 비공식 서비스 고지, 책임 범위 안내입니다.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-10 text-gray-800">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-xl sm:p-10">
        <Link href="/" className="text-sm font-black text-indigo-600 hover:underline">
          전적 검색으로 돌아가기
        </Link>
        <h1 className="mt-6 text-3xl font-black text-indigo-950 sm:text-4xl">이용 안내</h1>

        <Section title="서비스 성격">
          Brawl Status KR은 브롤스타즈 유저를 위한 비공식 팬 제작 분석 도구입니다.
          Supercell과 제휴, 후원, 승인 관계가 없으며 공식 서비스가 아닙니다.
        </Section>

        <Section title="데이터 정확도">
          전적과 통계는 외부 API 응답과 이 서비스 DB에 저장된 전투 기록을 바탕으로
          계산됩니다. API 지연, 누락, 게임 업데이트, 검색 주기 차이로 인해 실제 게임
          정보와 다를 수 있습니다.
        </Section>

        <Section title="25경기 검색 권장">
          공식 전투 기록은 최근 최대 25경기만 조회할 수 있습니다. 누적 통계를 더
          정확하게 쌓고 싶다면 25경기마다 한 번씩 플레이어 태그를 검색하는 것을
          권장합니다.
        </Section>

        <Section title="상표와 저작권">
          Brawl Stars, 브롤스타즈, 관련 이미지와 명칭은 각 권리자에게 속합니다. 이
          사이트는 팬 편의를 위한 정보 제공 목적의 도구입니다.
        </Section>

        <Section title="문의">
          오류 제보, 삭제 요청, 기타 문의는{" "}
          <a href="mailto:seunghunbag76@gmail.com" className="font-black text-indigo-700 hover:underline">
            seunghunbag76@gmail.com
          </a>
          으로 연락해 주세요.
        </Section>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-black text-indigo-900">{title}</h2>
      <p className="mt-3 font-semibold leading-7 text-gray-700">{children}</p>
    </section>
  );
}
