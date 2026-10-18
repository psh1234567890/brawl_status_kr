import { browserReturnShare } from "../../utils/adminUsageMetrics";
import type { ProductCounts, ProductSummary } from "../../utils/productFunnel";

const steps: Array<[keyof ProductCounts, string]> = [
  ["sessions", "측정 이용 세션"], ["active", "유효 이용 세션"],
  ["searches", "검색 성공 포함 세션"], ["followups", "검색 후 다음 행동 세션"],
];
const actions: Array<[keyof ProductCounts, string]> = [
  ["meta", "추천 확인"], ["compare", "비교 완료"], ["game", "미니게임 결과 확인"],
  ["save", "플레이어 저장"], ["share", "공유·복사 완료"],
];

export default function ProductFunnelPanel({ summary, period, label }: {
  summary: ProductSummary; period: "today" | "week" | "all"; label: string;
}) {
  const counts = period === "today" ? summary.today : period === "week" ? summary.last7Days : summary.allTime;
  const format = (key: keyof ProductCounts) => summary.trackingStartedAt ? counts[key].toLocaleString("ko-KR") : "—";
  const share = summary.trackingStartedAt ? browserReturnShare(counts.followups, counts.searches) : null;
  const activeShare = summary.trackingStartedAt ? browserReturnShare(counts.active, counts.sessions) : null;
  return <section aria-labelledby="product-funnel-title" className="rounded-xl border bg-white p-5 shadow-sm">
    <h2 id="product-funnel-title" className="text-lg font-black">{label} 유효 이용·검색 후 행동</h2>
    <p className="mt-1 text-sm text-slate-600">{summary.trackingStartedAt
      ? `계측 시작: ${new Date(summary.trackingStartedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`
      : "새 이용 흐름의 수집 대기 중 · 과거 기록은 소급하지 않습니다."}</p>
    <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {steps.map(([key, title]) => <div key={key} className="rounded-lg bg-slate-50 p-3">
        <dt className="text-xs font-bold text-slate-600">{title}</dt>
        <dd className="mt-1 text-2xl font-black tabular-nums text-blue-800">{format(key)}</dd>
      </div>)}
    </dl>
    <p className="mt-4 font-bold">검색 → 다음 행동 비율: {share === null ? "—" : `${share.toFixed(1)}%`}</p>
    <p className="mt-1 text-sm text-slate-600">유효 이용 세션 비중: {activeShare === null ? "—" : `${activeShare.toFixed(1)}%`}</p>
    <dl className="mt-4 grid gap-2 sm:grid-cols-2">
      {actions.map(([key, title]) => <div key={key} className="flex justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
        <dt>{title}</dt><dd className="font-bold tabular-nums">{format(key)}세션</dd>
      </div>)}
    </dl>
    <p className="mt-4 text-xs leading-5 text-slate-500">유효 이용은 검색 성공, 표본이 있는 추천 확인, 비교 완료 또는 한 문제 이상 푼 게임의 결과 확인입니다. 검색 이후의 추천·비교·게임·저장·공유를 같은 세션에서 각각 한 번 집계합니다. 여러 행동을 한 세션은 항목별로 중복되므로 항목 합계가 다음 행동 세션보다 클 수 있습니다.</p>
    <p className="mt-2 text-xs leading-5 text-slate-500">30분 비활동 또는 한국 시간 날짜 변경 시 새 측정 세션으로 봅니다. 시각·완료 여부만 이 브라우저에 보관하고 서버에는 고정된 항목별 합계만 보냅니다. 저장소 차단·초기화·여러 탭과 기기·전송 실패에 영향을 받는 근삿값이며 순 방문자 수·MAU·D7 코호트 재방문율이 아닙니다.</p>
  </section>;
}
