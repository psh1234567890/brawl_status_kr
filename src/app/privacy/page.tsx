import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "Brawl Status KR의 개인정보 수집, 이용, 쿠키, 광고, 외부 API 사용에 관한 안내입니다.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-10 text-gray-800">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-xl sm:p-10">
        <Link href="/" className="text-sm font-black text-indigo-600 hover:underline">
          전적 검색으로 돌아가기
        </Link>
        <h1 className="mt-6 text-3xl font-black text-indigo-950 sm:text-4xl">
          개인정보처리방침
        </h1>
        <p className="mt-3 text-sm font-bold text-gray-500">시행일: 2026년 6월 4일</p>
        <p className="mt-6 font-semibold leading-7 text-gray-700">
          Brawl Status KR은 이용자의 개인정보를 불필요하게 수집하지 않으며, 서비스
          제공과 품질 개선에 필요한 최소한의 정보만 처리합니다.
        </p>

        <PolicySection title="수집하는 정보">
          <ul className="list-disc space-y-2 pl-5">
            <li>이용자가 입력한 브롤스타즈 플레이어 태그</li>
            <li>공식 API를 통해 조회된 공개 게임 프로필과 최근 전투 기록</li>
            <li>서비스 보안과 오류 대응을 위한 기본 접속 로그</li>
            <li>문의 메일을 보낸 경우 이메일 주소와 문의 내용</li>
          </ul>
        </PolicySection>

        <PolicySection title="정보 이용 목적">
          <ul className="list-disc space-y-2 pl-5">
            <li>플레이어 전적 검색과 최근 전투 기록 표시</li>
            <li>브롤러별 누적 승률과 맵별 추천 통계 계산</li>
            <li>오류 수정, 악성 요청 방지, 서비스 안정성 개선</li>
            <li>문의 응답과 기능 개선 검토</li>
          </ul>
        </PolicySection>

        <PolicySection title="쿠키와 광고">
          <p>
            현재 서비스는 로그인 기능을 제공하지 않습니다. 향후 Google AdSense 등 광고
            서비스가 적용될 경우, 광고 제공자는 쿠키 또는 유사 기술을 사용해 광고
            노출과 성과 측정을 수행할 수 있습니다. 이용자는 브라우저 설정에서 쿠키를
            제한하거나 삭제할 수 있습니다.
          </p>
        </PolicySection>

        <PolicySection title="제3자 서비스">
          <p>
            플레이어 정보와 전투 기록 조회를 위해 Brawl Stars API 또는 API 프록시를
            사용할 수 있습니다. 사이트 운영과 배포에는 Vercel, GitHub 등 외부 인프라가
            사용될 수 있습니다.
          </p>
        </PolicySection>

        <PolicySection title="보관 기간">
          <p>
            전투 기록과 통계 데이터는 서비스 제공과 통계 품질 유지를 위해 보관될 수
            있습니다. 문의 메일은 문의 처리와 분쟁 대응에 필요한 기간 동안 보관됩니다.
          </p>
        </PolicySection>

        <PolicySection title="문의">
          <p>
            개인정보 관련 문의는{" "}
            <a href="mailto:seunghunbag76@gmail.com" className="font-black text-indigo-700 hover:underline">
              seunghunbag76@gmail.com
            </a>
            으로 연락해 주세요.
          </p>
        </PolicySection>
      </article>
    </main>
  );
}

function PolicySection({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-black text-indigo-900">{title}</h2>
      <div className="mt-3 font-semibold leading-7 text-gray-700">{children}</div>
    </section>
  );
}
