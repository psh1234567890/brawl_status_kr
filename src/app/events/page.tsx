import type { Metadata } from "next";
import Link from "next/link";
import BrawlImage from "../../components/BrawlImage";
import PortalLayout, { EmptyState, StatPill } from "../../components/PortalLayout";
import { mapDict, modeDict } from "../../constants/brawl";
import { getBrawlifyEvents } from "../../server/brawlify";
import type { BrawlifyEvent } from "../../types/brawlify";

export const metadata: Metadata = {
  title: "현재 맵 로테이션",
  description: "Brawlify 공개 API 기반으로 브롤스타즈 현재/예정 이벤트 로테이션을 확인합니다.",
  alternates: { canonical: "/events" },
};

export default async function EventsPage() {
  const events = await getBrawlifyEvents().catch(() => ({ active: [], upcoming: [] }));
  const total = events.active.length + events.upcoming.length;

  return (
    <PortalLayout
      title="현재 맵 로테이션"
      eyebrow="Live Rotation"
      description="Brawlify 이벤트 데이터를 기반으로 현재 열려 있는 맵과 예정 맵을 보여줍니다. 저장된 전투 표본이 있는 맵은 맵 추천 페이지에서 우리 DB 기반 승률도 함께 확인할 수 있습니다."
      actions={<LinkButton href="/meta">DB 추천 보기</LinkButton>}
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <StatPill label="현재 이벤트" value={events.active.length} />
        <StatPill label="예정 이벤트" value={events.upcoming.length} />
        <StatPill label="전체 슬롯" value={total} />
      </section>

      <EventSection title="진행 중" events={events.active} />
      <EventSection title="예정" events={events.upcoming} />
    </PortalLayout>
  );
}

function EventSection({ title, events }: { title: string; events: BrawlifyEvent[] }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-black text-indigo-950">{title}</h2>
      {events.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event, index) => {
            const map = event.map;
            const modeName = map?.gameMode?.name ?? event.slot?.name ?? "Unknown";
            const mapName = map?.name ?? "Unknown Map";
            return (
              <article key={`${title}-${map?.id ?? index}-${event.startTime ?? ""}`} className="overflow-hidden rounded-lg border border-white bg-white shadow-sm">
                {map?.imageUrl ? (
                  <BrawlImage
                    src={map.imageUrl}
                    alt={mapName}
                    width={640}
                    height={320}
                    className="h-40 w-full object-cover"
                    fallbackText={mapName.slice(0, 1)}
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-indigo-50 text-3xl font-black text-indigo-200">
                    {mapName.slice(0, 1)}
                  </div>
                )}
                <div className="flex flex-col gap-3 p-4">
                  <div>
                    <p className="text-xs font-black text-indigo-500">{modeDict[modeName] ?? modeName}</p>
                    <h3 className="mt-1 text-xl font-black text-gray-900">{mapDict[mapName] ?? mapName}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-gray-500">
                    <span>시작: {formatDate(event.startTime)}</span>
                    <span>종료: {formatDate(event.endTime)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {map?.id ? <LinkButton href={`/maps/${map.id}`}>맵 상세</LinkButton> : null}
                    <LinkButton href={`/meta`}>추천 보기</LinkButton>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState text="현재 공개 API에서 반환된 이벤트가 없습니다. Brawlify API 응답이 비어 있으면 이 영역도 비어 보입니다." />
      )}
    </section>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-indigo-700">
      {children}
    </Link>
  );
}
