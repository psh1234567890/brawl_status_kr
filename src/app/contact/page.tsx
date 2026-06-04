import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "문의",
  description:
    "Brawl Status KR의 버그 제보, 기능 건의, 운영 문의를 위한 연락처 안내입니다.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-10 text-gray-800">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-xl sm:p-10">
        <Link href="/" className="text-sm font-black text-indigo-600 hover:underline">
          전적 검색으로 돌아가기
        </Link>
        <h1 className="mt-6 text-3xl font-black text-indigo-950 sm:text-4xl">문의</h1>
        <p className="mt-4 font-semibold leading-7 text-gray-700">
          사이트 이용 중 오류를 발견했거나 기능 제안, 데이터 관련 문의가 있으면 아래
          이메일로 연락해 주세요.
        </p>

        <section className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
          <h2 className="text-xl font-black text-indigo-900">운영자 연락처</h2>
          <a
            href="mailto:seunghunbag76@gmail.com"
            className="mt-3 inline-block break-all text-lg font-black text-indigo-700 hover:underline"
          >
            seunghunbag76@gmail.com
          </a>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-black text-indigo-900">문의 시 포함하면 좋은 내용</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 font-semibold leading-7 text-gray-700">
            <li>문제가 발생한 페이지 주소</li>
            <li>검색한 플레이어 태그</li>
            <li>오류 메시지 또는 화면 캡처</li>
            <li>사용한 기기와 브라우저 종류</li>
          </ul>
        </section>
      </article>
    </main>
  );
}
