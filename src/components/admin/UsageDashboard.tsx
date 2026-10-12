"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { countryShare, searchSuccessRate } from "../../utils/adminUsageMetrics";
import { summarizeApiPerformance, type ApiPerformanceCounts } from "../../utils/apiPerformanceMetrics";

type Counts = { visits: number; searches: number; successfulSearches: number; gameEnds: number };
type FailureReasons = Record<string, number>;
type SearchTagSummary = {
  playerTag: string;
  searchCount: string;
  lastSearchedAt: string;
  countries?: Array<{ countryCode: string; searchCount: string }>;
};
type Summary = {
  recentSearchTags: SearchTagSummary[];
  apiPerformance24h?: ApiPerformanceCounts[];
  apiPerformance7d?: ApiPerformanceCounts[];
  searchCountries7Days?: Array<{ countryCode: string; searchCount: string }>;
  today: Counts;
  last7Days: Counts;
  allTime: Counts;
  trackingStartedAt: string | null;
  daily: Array<Counts & { day: string }>;
  byGame: Record<string, number>;
  byGameToday: Record<string, number>;
  byGameAllTime: Record<string, number>;
  failureReasonsToday?: FailureReasons;
  failureReasonsLast7Days?: FailureReasons;
  failureReasonsAllTime?: FailureReasons;
  recentHours: Array<{ hour: string; kind: string; count: string }>;
  sampledAt: string;
};
const games: Record<string, string> = {
  brawler_quiz: "브롤러 맞추기",
  silhouette_quiz: "실루엣 맞추기",
  map_quiz: "맵 맞추기",
  ability_quiz: "능력 맞추기",
};
const activities: Record<string, string> = {
  visit_session: "방문 세션",
  player_search_success: "성공한 플레이어 검색",
  player_search_error: "실패한 플레이어 검색",
  player_search_error_404: "실패 원인: 존재하지 않는 태그 (404)",
  player_search_error_429: "실패 원인: 외부 요청 제한 (429)",
  player_search_error_5xx: "실패 원인: 서버·외부 API 장애 (5xx)",
  player_search_error_other: "실패 원인: 기타 오류",
  minigame_brawler_quiz: "브롤러 맞추기 종료",
  minigame_silhouette_quiz: "실루엣 맞추기 종료",
  minigame_map_quiz: "맵 맞추기 종료",
  minigame_ability_quiz: "능력 맞추기 종료",
};
const n = (value: number) => value.toLocaleString("ko-KR");
const regionNames = new Intl.DisplayNames(["ko-KR"], { type: "region" });
function visitorCountryLabel(code: string) {
  if (code === "ZZ" || !/^[A-Z]{2}$/.test(code)) return { emoji: "🌐", label: "국가 미확인" };
  const emoji = [...code].map(letter => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)).join("");
  return { emoji, label: code === "KR" ? "한국" : regionNames.of(code) ?? code };
}
type Period = "today" | "week" | "all";
const periods: Array<{ key: Period; label: string }> = [
  { key: "today", label: "오늘" },
  { key: "week", label: "최근 7일" },
  { key: "all", label: "전체 누적" },
];
const failureKinds = [
  { key: "player_search_error_404", label: "플레이어 없음 (404)" },
  { key: "player_search_error_429", label: "외부 API 요청 제한 (429)" },
  { key: "player_search_error_5xx", label: "서버·외부 API 오류 (5xx)" },
  { key: "player_search_error_other", label: "기타 응답 오류" },
] as const;
const monitoredRoutes: Record<string, string> = {
  "api.player": "플레이어 프로필",
  "api.player.matches.read": "전투 기록 조회",
  "api.player.matches.save": "전투 기록 저장",
  "api.player.skins": "보유 스킨",
  "api.meta": "맵 메타",
  "api.meta.counters": "카운터 추천",
  "api.meta.teams": "팀 추천",
};

export default function UsageDashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [period, setPeriod] = useState<Period>("today");
  const [tagFilter, setTagFilter] = useState("");
  const [tagSort, setTagSort] = useState<"recent" | "popular">("recent");
  const [performancePeriod, setPerformancePeriod] = useState<"24h" | "7d">("24h");
  const [optOut, setOptOut] = useState(() =>
    typeof document !== "undefined" && document.cookie.includes("brawl_analytics_opt_out=1")
  );

  async function refresh(signal?: AbortSignal) {
    try {
      const response = await fetch("/api/admin/usage", { cache: "no-store", signal });
      if (response.status === 404 || response.status === 401 || response.status === 403) {
        setStatus("denied"); return;
      }
      if (!response.ok) throw new Error("UNAVAILABLE");
      const body = await response.json() as Summary;
      if (signal?.aborted) return;
      setData(body); setStatus("ready");
    } catch {
      if (!signal?.aborted) setStatus("error");
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/usage", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (controller.signal.aborted) return;
        if ([401, 403, 404].includes(response.status)) {
          setStatus("denied");
          return;
        }
        if (!response.ok) throw new Error("UNAVAILABLE");
        const body = await response.json() as Summary;
        if (!controller.signal.aborted) {
          setData(body);
          setStatus("ready");
        }
      })
      .catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, []);

  function toggleOptOut() {
    const next = !optOut;
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = next
      ? "brawl_analytics_opt_out=1; Path=/; Max-Age=31536000; SameSite=Lax" + secure
      : "brawl_analytics_opt_out=; Path=/; Max-Age=0; SameSite=Lax" + secure;
    setOptOut(next);
  }

  const max = Math.max(1, ...((data?.daily ?? []).map(item => item.visits)));
  const searchMax = Math.max(1, ...((data?.daily ?? []).map(item => item.searches ?? 0)));
  const counts = data ? (
    period === "today" ? data.today : period === "week" ? data.last7Days : data.allTime
  ) : null;
  const gameCounts = data ? (
    period === "today" ? data.byGameToday : period === "week" ? data.byGame : data.byGameAllTime
  ) : {};
  const failureCounts = data ? (
    period === "today" ? data.failureReasonsToday
      : period === "week" ? data.failureReasonsLast7Days
        : data.failureReasonsAllTime
  ) ?? {} : {};
  const failedSearches = Math.max(0, (counts?.searches ?? 0) - (counts?.successfulSearches ?? 0));
  const successRate = counts ? searchSuccessRate(counts) : null;
  const countryRows = data?.searchCountries7Days ?? [];
  const countryTotal = countryRows.reduce((sum, row) => sum + Number(row.searchCount), 0);
  const visibleTags = (data?.recentSearchTags ?? [])
    .filter((row) => row.playerTag.toUpperCase().includes(tagFilter.trim().replace(/^#/, "").toUpperCase()))
    .sort((a, b) => tagSort === "popular"
      ? Number(b.searchCount) - Number(a.searchCount) || a.playerTag.localeCompare(b.playerTag)
      : new Date(b.lastSearchedAt).getTime() - new Date(a.lastSearchedAt).getTime());
  const classifiedFailures = failureKinds.reduce((total, reason) => total + (failureCounts[reason.key] ?? 0), 0);
  const unknownFailures = Math.max(0, failedSearches - classifiedFailures);
  const periodLabel = periods.find(item => item.key === period)?.label ?? "오늘";
  const apiPerformance = (performancePeriod === "24h" ? data?.apiPerformance24h : data?.apiPerformance7d) ?? [];
  const totalMeasured = apiPerformance.reduce((sum, item) => sum + summarizeApiPerformance(item).requests, 0);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-blue-600">Brawl Status KR · PRIVATE</p>
          <h1 className="mt-1 text-3xl font-black">사이트 이용 통계</h1>
          <p className="mt-2 text-sm text-slate-600">방문은 익명 시간대별 합계로, 검색 태그와 방문자 접속 국가 코드는 7일간 시간대별 합계로 기록합니다. 검색자의 IP·사이트 계정 정보는 검색 통계에 저장하지 않습니다. 방문 세션은 순 방문자 수가 아닙니다.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href="/" className="rounded-lg border px-3 py-2 text-sm font-bold">사이트로 돌아가기</Link>
            <button type="button" className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white" onClick={() => void refresh()}>새로고침</button>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={optOut} onChange={toggleOptOut} /> 이 브라우저의 방문·검색·게임 활동 제외
            </label>
          </div>
        </header>
        {status === "loading" ? <p role="status">통계 불러오는 중...</p> : null}
        {status === "denied" ? (
          <section className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-black">운영자 인증 필요</h2>
            <p className="mt-2 text-sm">Google 계정에 로그인한 뒤 비공개 운영자 허용 목록에 등록된 계정으로 접근해야 합니다. 계정이 등록되지 않았다면 데이터가 표시되지 않습니다.</p>
            <Link href="/account" className="mt-3 inline-block text-blue-700 underline">계정 화면으로 이동</Link>
          </section>
        ) : null}
        {status === "error" ? <p role="alert">통계를 조회하지 못했습니다. 잠시 후 새로고침해 주세요.</p> : null}
        {data && status === "ready" ? (
          <>
            <p className="text-xs text-slate-500">한국 시간 기준 · 갱신: {new Date(data.sampledAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
            <section className="rounded-xl border bg-white p-5 shadow-sm" aria-labelledby="api-performance-title">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="api-performance-title" className="text-lg font-black">API 응답 성능·장애</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    신규 집계 도입 이후 API별 익명 시간대 통계 · 검색자·태그·IP·계정·요청 ID 저장 없음
                  </p>
                </div>
                <div role="group" aria-label="API 성능 집계 기간" className="flex gap-2">
                  {(["24h", "7d"] as const).map((value) => (
                    <button key={value} type="button" aria-pressed={performancePeriod === value}
                      onClick={() => setPerformancePeriod(value)}
                      className={`min-h-11 rounded-lg border px-3 text-sm font-bold ${performancePeriod === value
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-slate-200 bg-white text-slate-700"}`}>
                      {value === "24h" ? "API 24시간" : "API 7일"}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-500">
                측정 요청 {n(totalMeasured)}건 · 5xx는 서버/외부 API 장애 응답 · 429는 요청 제한
                · P95는 시간 구간별 근삿값이며 정확한 밀리초 측정치가 아닙니다
              </p>
              {totalMeasured === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  해당 기간 측정된 운영 API 요청이 없습니다. 배포 이전 데이터는 소급해 표시할 수 없습니다.
                </p>
              ) : (
                <div role="region" aria-label="API별 성능 집계표" tabIndex={0}
                  className="mt-4 overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                  <table className="w-full min-w-[675px] border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th scope="col" className="px-3 py-3">API</th>
                        <th scope="col" className="px-3 py-3 text-right">요청</th>
                        <th scope="col" className="px-3 py-3 text-right">평균</th>
                        <th scope="col" className="px-3 py-3 text-right">P95 구간</th>
                        <th scope="col" className="px-3 py-3 text-right">5xx</th>
                        <th scope="col" className="px-3 py-3 text-right">429</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiPerformance.map((item) => {
                        const summary = summarizeApiPerformance(item);
                        return (
                          <tr key={item.route} className="border-t border-slate-100">
                            <td className="px-3 py-3 font-bold" title={item.route}>{monitoredRoutes[item.route] ?? item.route}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{n(summary.requests)}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{summary.averageMs === null ? "—" : `${n(summary.averageMs)}ms`}</td>
                            <td className="px-3 py-3 text-right whitespace-nowrap">{summary.p95Band ?? "—"}</td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              {n(summary.serverErrors)}건 ({summary.serverErrorRate?.toFixed(1) ?? "—"}%)
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              {n(summary.rateLimited)}건 ({summary.limitRate?.toFixed(1) ?? "—"}%)
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="text-base font-black text-slate-900">집계 기간</h2>
              <div role="group" aria-label="집계 기간 선택" className="mt-3 flex flex-wrap gap-2">
                {periods.map(item => (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={period === item.key}
                    onClick={() => setPeriod(item.key)}
                    className={`rounded-lg border px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                      period === item.key
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-blue-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-600">
                {period === "today"
                  ? "오늘 00:00부터 현재까지 · 한국 시간 기준"
                  : period === "week"
                    ? "오늘을 포함한 최근 7개 날짜 · 한국 시간 기준"
                    : `통계 수집 시작 이후 누적 · ${
                        data.trackingStartedAt
                          ? new Date(data.trackingStartedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
                          : "아직 수집된 기록 없음"
                      }부터 · 이전 Vercel 로그는 포함되지 않음`}
              </p>
            </div>
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 p-5">
              <div>
                <h2 className="text-sm font-black text-blue-950">{periodLabel} 플레이어 검색 성공률</h2>
                <p className="mt-1 text-xs leading-5 text-blue-700">성공 검색 ÷ 전체 검색 요청. 검색 요청이 없으면 비율을 표시하지 않음</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black tabular-nums text-blue-900">{successRate === null ? "—" : `${successRate.toFixed(1)}%`}</p>
                <p className="text-xs font-semibold text-blue-700">{n(counts?.successfulSearches ?? 0)} / {n(counts?.searches ?? 0)}건</p>
              </div>
            </section>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [`${periodLabel} 방문 세션`, counts?.visits ?? 0],
                [`${periodLabel} 플레이어 검색`, counts?.searches ?? 0],
                [`${periodLabel} 검색 성공`, counts?.successfulSearches ?? 0],
                [`${periodLabel} 미니게임 종료`, counts?.gameEnds ?? 0],
              ].map(([label, value]) => (
                <article key={String(label)} className="rounded-xl border bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-black text-blue-800">{n(Number(value))}</p>
                </article>
              ))}
            </div>
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">{periodLabel} 플레이어 검색 실패 원인</h2>
              <p className="mt-1 text-sm text-slate-600">조회에 실패한 검색 {n(failedSearches)}회 · 오류 유형은 집계 기능 도입 이후부터 구분됩니다.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {failureKinds.map(reason => (
                  <div key={reason.key} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-3 text-sm">
                    <span>{reason.label}</span>
                    <strong>{n(failureCounts[reason.key] ?? 0)}회</strong>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-100 px-3 py-3 text-sm">
                  <span>이전 기록·미분류 오류</span>
                  <strong>{n(unknownFailures)}회</strong>
                </div>
              </div>
            </section>
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">최근 7일 방문 세션 추이</h2>
              <p className="mt-1 text-sm text-slate-600">합계 {n(data.last7Days.visits)}회 방문 세션 · {n(data.last7Days.searches)}회 검색 · {n(data.last7Days.gameEnds)}회 게임 종료</p>
              <div className="mt-5 flex h-44 items-end justify-between gap-2">
                {data.daily.map(day => (
                  <div key={day.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-semibold">{n(day.visits)}</span>
                    <div className="w-full rounded-t bg-blue-600" style={{ height: Math.max(2, (day.visits / max) * 120) }} />
                    <span className="text-xs text-slate-500">{day.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            </section>
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black">최근 7일 플레이어 검색 추이</h2>
                <p className="mt-1 text-sm text-slate-600">일별 검색 요청과 성공 횟수 · 한국 시간 기준</p>
                <div className="mt-5 flex h-44 items-end justify-between gap-2" role="img" aria-label="최근 7일 날짜별 검색 요청 횟수 막대그래프">
                  {data.daily.map(day => (
                    <div key={day.day} className="flex min-w-0 flex-1 flex-col items-center gap-2" title={`${day.day}: 검색 ${day.searches ?? 0}회, 성공 ${day.successfulSearches ?? 0}회`}>
                      <span className="text-xs font-semibold tabular-nums">{n(day.searches ?? 0)}</span>
                      <div className="w-full rounded-t bg-indigo-600" style={{ height: !day.searches ? 0 : Math.max(2, (day.searches / searchMax) * 120) }} />
                      <span className="text-[11px] text-slate-500">{day.day.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black">최근 7일 검색 방문 국가</h2>
                <p className="mt-1 text-sm text-slate-600">
                  전체 검색 태그 기준 국가별 누적 요청 · {n(countryTotal)}회 · IP/계정 저장 없음
                </p>
                {countryTotal === 0 ? <p className="mt-4 text-sm text-slate-500">집계된 국가 정보가 없습니다.</p> : null}
                <div className="mt-3 space-y-3">
                  {countryRows.slice(0, 8).map((row) => {
                    const country = visitorCountryLabel(row.countryCode);
                    const count = Number(row.searchCount);
                    const share = countryShare(count, countryTotal);
                    return (
                      <div key={row.countryCode}>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-semibold">{country.emoji} {country.label}</span>
                          <span className="tabular-nums text-slate-600">{n(count)}회 · {share.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, share)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {countryRows.length > 8 ? <p className="text-xs text-slate-500">상위 8개 국가 표시 · 기타 {countryRows.length - 8}개 국가</p> : null}
                </div>
              </section>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black">{periodLabel} 미니게임별 종료</h2>
                {Object.keys(games).map(game => (
                  <div key={game} className="flex justify-between border-b py-3 text-sm">
                    <span>{games[game]}</span><strong>{n(gameCounts[game] ?? 0)}회</strong>
                  </div>
                ))}
              </section>
              <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black">최근 24시간 활동 (시간대별)</h2>
                <div className="mt-3 max-h-80 overflow-y-auto">
                  {data.recentHours.length === 0 ? <p className="text-sm text-slate-500">아직 집계된 활동이 없습니다.</p> : null}
                  {data.recentHours.map((row) => (
                    <div key={row.hour + row.kind} className="flex justify-between gap-2 border-b py-2 text-xs sm:text-sm">
                      <span>{row.hour.slice(5)} · {activities[row.kind] ?? "활동"}</span>
                      <strong>{n(Number(row.count))}회</strong>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">최근 검색된 플레이어 태그</h2>
              <p className="mt-1 text-sm text-slate-600">최근 7일(시간 단위) · 최근 검색 순 최대 200개 태그 · 방문자의 접속 국가 추정치(플레이어 계정 국가 아님) · 검색자 IP·사이트 계정 정보는 검색 통계에 저장하지 않음 · 기존 기록의 국가는 알 수 없음</p>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="min-w-48 flex-1 text-xs font-bold text-slate-600">
                  태그 검색
                  <input
                    type="search"
                    value={tagFilter}
                    onChange={(event) => setTagFilter(event.target.value)}
                    placeholder="플레이어 태그 입력"
                    className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  정렬
                  <select
                    value={tagSort}
                    onChange={(event) => setTagSort(event.target.value as "recent" | "popular")}
                    className="mt-1 block min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
                  >
                    <option value="recent">마지막 검색 순</option>
                    <option value="popular">검색 횟수 순</option>
                  </select>
                </label>
                <span className="pb-3 text-xs text-slate-500">{n(visibleTags.length)}개 표시</span>
              </div>
              <div
                role="region"
                aria-label="최근 검색된 플레이어 태그 목록"
                tabIndex={0}
                className="mt-4 h-72 overflow-auto overscroll-contain rounded-lg border border-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:h-80"
              >
                <table className="w-full min-w-[660px] border-collapse text-left text-xs sm:text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="border-b bg-slate-50 text-slate-700">
                      <th className="px-3 py-2">검색된 플레이어 태그</th>
                      <th className="px-3 py-2">마지막 검색 (한국 시간)</th>
                      <th className="px-3 py-2">최근 검색 횟수</th>
                      <th className="px-3 py-2">검색 방문자 접속 국가별 횟수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTags.map((item) => {
                      const countries = item.countries ?? [];
                      const unclassified = Math.max(0,
                        Number(item.searchCount) - countries.reduce((sum, entry) => sum + Number(entry.searchCount), 0));
                      return <tr className="border-b" key={item.playerTag}>
                        <td className="px-3 py-2 font-bold">#{item.playerTag}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{new Date(item.lastSearchedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</td>
                        <td className="px-3 py-2">{n(Number(item.searchCount))}회</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            {countries.map(entry => {
                              const country = visitorCountryLabel(entry.countryCode);
                              return <span key={entry.countryCode} title={entry.countryCode} className="inline-flex whitespace-nowrap rounded-md bg-blue-50 px-2 py-1 font-semibold text-blue-900">
                                {country.emoji} {country.label} {n(Number(entry.searchCount))}회
                              </span>;
                            })}
                            {unclassified > 0 ? <span className="inline-flex whitespace-nowrap rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                              이전 기록·미분류 {n(unclassified)}회
                            </span> : null}
                          </div>
                        </td>
                      </tr>;
                    })}
                  </tbody>
                </table>
                {(data.recentSearchTags ?? []).length === 0 ? (
                  <p className="px-3 py-4 text-sm text-slate-500">아직 새 방식으로 기록된 검색 태그가 없습니다. 배포 이후의 성공 검색부터 집계합니다.</p>
                ) : null}
                {(data.recentSearchTags ?? []).length > 0 && visibleTags.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-slate-500">검색 조건에 맞는 태그가 없습니다.</p>
                ) : null}
              </div>
            </section>
            <p className="text-xs leading-6 text-slate-500">방문 횟수는 순 방문자 수가 아닌 브라우저 탭 세션 추정치입니다. 전체 누적은 추적 기능 도입 시점부터의 익명 합계이며, 시간별 상세 기록은 90일 후 정리됩니다. 과거 Vercel 로그는 복원하지 않습니다. 자동화 요청, 광고 차단, 저장소 접근 제한, 통신 실패 등에 따라 실제 이용자와 차이가 날 수 있습니다. 운영자 통계는 공유하지 마세요.</p>
          </>
        ) : null}
      </div>
    </main>
  );
}
