import Link from "next/link";
import type { ReactNode } from "react";

interface PortalLayoutProps {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

const navItems = [
  { href: "/", label: "전적 검색" },
  { href: "/events", label: "로테이션" },
  { href: "/meta", label: "맵 추천" },
  { href: "/maps", label: "맵 도감" },
  { href: "/gamemodes", label: "모드" },
  { href: "/brawlers", label: "브롤러" },
  { href: "/skins", label: "스킨" },
  { href: "/clubs", label: "클럽" },
  { href: "/rankings", label: "랭킹" },
  { href: "/teams", label: "팀 조합" },
  { href: "/counters", label: "카운터" },
  { href: "/status", label: "수집 현황" },
];

export default function PortalLayout({
  title,
  eyebrow,
  description,
  children,
  actions,
}: PortalLayoutProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-6">
          <nav className="flex flex-wrap gap-2" aria-label="주요 기능">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-indigo-100 bg-white px-4 py-2 text-sm font-black text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              {eyebrow ? (
                <p className="mb-2 text-sm font-black uppercase text-indigo-500">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="text-3xl font-black text-indigo-950 sm:text-5xl">{title}</h1>
              {description ? (
                <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-gray-600 sm:text-base">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
          </div>
        </header>
        <AdSlot />
        {children}
      </div>
    </main>
  );
}

export function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-black text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-black text-indigo-700">{value}</p>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-indigo-200 bg-white/70 p-8 text-center text-sm font-bold text-gray-500">
      {text}
    </div>
  );
}

export function AdSlot() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID;
  if (clientId && slotId) {
    return (
      <aside className="rounded-lg border border-indigo-100 bg-white p-3 shadow-sm">
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={clientId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border border-dashed border-indigo-200 bg-white/70 px-5 py-4 text-center text-xs font-bold text-gray-500">
      광고 영역
      <span className="ml-2 text-gray-400">
        AdSense 승인 후 환경 변수로 실제 광고 슬롯을 연결할 수 있습니다.
      </span>
    </aside>
  );
}
