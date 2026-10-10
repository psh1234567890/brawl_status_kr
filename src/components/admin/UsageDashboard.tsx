"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Counts = { visits: number; searches: number; successfulSearches: number; gameEnds: number };
type Summary = {
  today: Counts;
  last7Days: Counts;
  daily: Array<Counts & { day: string }>;
  byGame: Record<string, number>;
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
  minigame_brawler_quiz: "브롤러 맞추기 종료",
  minigame_silhouette_quiz: "실루엣 맞추기 종료",
  minigame_map_quiz: "맵 맞추기 종료",
  minigame_ability_quiz: "능력 맞추기 종료",
};
const n = (value: number) => value.toLocaleString("ko-KR");

export default function UsageDashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "error">("loading");
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
    void refresh(controller.signal);
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
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-blue-600">Brawl Status KR · PRIVATE</p>
          <h1 className="mt-1 text-3xl font-black">사이트 이용 통계</h1>
          <p className="mt-2 text-sm text-slate-600">플레이어 태그·IP·계정 정보 없이 시간대별 횟수만 저장합니다. 방문 세션은 순 방문자 수가 아닙니다.</p>
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
            <p className="mt-2 text-sm">Google 계정 로그인 후 운영자 허용 목록에 등록된 계정으로 접근해야 합니다. USAGE_ADMIN_USER_IDS가 설정되지 않은 경우에도 접근이 차단됩니다.</p>
            <Link href="/account" className="mt-3 inline-block text-blue-700 underline">계정 화면으로 이동</Link>
          </section>
        ) : null}
        {status === "error" ? <p role="alert">통계를 조회하지 못했습니다. 잠시 후 새로고침해 주세요.</p> : null}
        {data && status === "ready" ? (
          <>
            <p className="text-xs text-slate-500">한국 시간 기준 · 갱신: {new Date(data.sampledAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["오늘 방문 세션", data.today.visits],
                ["오늘 플레이어 검색", data.today.searches],
                ["오늘 검색 성공", data.today.successfulSearches],
                ["오늘 미니게임 종료", data.today.gameEnds],
              ].map(([label, value]) => (
                <article key={String(label)} className="rounded-xl border bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-black text-blue-800">{n(Number(value))}</p>
                </article>
              ))}
            </div>
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
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black">최근 7일 미니게임별 종료</h2>
                {Object.keys(games).map(game => (
                  <div key={game} className="flex justify-between border-b py-3 text-sm">
                    <span>{games[game]}</span><strong>{n(data.byGame[game] ?? 0)}회</strong>
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
            <p className="text-xs leading-6 text-slate-500">표시 숫자는 오늘부터 새로 수집됩니다. 과거 Vercel 로그는 복원하지 않습니다. 자동화 요청, 광고 차단, 저장소 접근 제한, 통신 실패 등에 따라 실제 이용자와 차이가 날 수 있습니다. 운영자 통계는 공유하지 마세요.</p>
          </>
        ) : null}
      </div>
    </main>
  );
}
