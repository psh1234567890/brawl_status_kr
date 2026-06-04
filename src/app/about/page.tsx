import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "서비스 소개",
  description:
    "Brawl Status KR의 전적 검색, 최근 전투 분석, 맵별 추천 브롤러, 스킨 카탈로그 기능을 소개합니다.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-10 text-gray-800">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-xl sm:p-10">
        <Link href="/" className="text-sm font-black text-indigo-600 hover:underline">
          전적 검색으로 돌아가기
        </Link>
        <h1 className="mt-6 text-3xl font-black text-indigo-950 sm:text-4xl">
          Brawl Status KR 소개
        </h1>
        <p className="mt-4 text-base font-bold leading-7 text-gray-600">
          Brawl Status KR은 브롤스타즈 플레이어가 자신의 전적과 보유 브롤러 상태를
          한국어로 빠르게 확인할 수 있도록 만든 팬 제작 분석 도구입니다.
        </p>

        <section className="mt-8">
          <h2 className="text-xl font-black text-indigo-900">주요 기능</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 font-semibold leading-7 text-gray-700">
            <li>플레이어 태그 기반 프로필과 최근 전투 기록 검색</li>
            <li>최근 25전 승률, 승패, 주력 모드, 전투 상세 확인</li>
            <li>보유 브롤러의 가젯, 스타파워, 하이퍼차지, 기어, 스킨 정보 표시</li>
            <li>DB에 저장된 전체 전투 표본 기반 맵별 추천 브롤러 제공</li>
            <li>브롤러별 스킨 카탈로그와 가격, 희귀도 검색</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-black text-indigo-900">데이터 기준</h2>
          <p className="mt-3 font-semibold leading-7 text-gray-700">
            전투 기록은 공식 API가 제공하는 최근 최대 25경기 범위 안에서 수집됩니다.
            더 정확한 누적 통계를 원한다면 25경기마다 한 번씩 검색하는 것을 권장합니다.
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
          <h2 className="text-xl font-black text-indigo-900">비공식 팬 사이트 안내</h2>
          <p className="mt-3 font-semibold leading-7 text-indigo-800">
            이 사이트는 Supercell과 제휴, 후원, 승인 관계가 없는 비공식 팬 제작
            서비스입니다. Brawl Stars 관련 명칭과 이미지는 각 권리자에게 속합니다.
          </p>
        </section>
      </article>
    </main>
  );
}
