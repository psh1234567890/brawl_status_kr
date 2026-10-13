"use client";
import { useState } from "react";
import { emptyFinance, financeFields, financeSummary, type MonthlyFinance } from "../../utils/monthlyFinance";
const KEY = "brawl_admin_monthly_finance_v1";
const labels = { advertising: "광고 수익", sponsorship: "스폰서 수익", donations: "순수 후원", hosting: "호스팅 비용", database: "DB 비용", domain: "도메인 월 환산 비용", other: "기타 비용·수수료" };

export default function MonthlyFinancePanel() {
  const [values, setValues] = useState<MonthlyFinance>(emptyFinance);
  const [feedback, setFeedback] = useState("");
  const summary = financeSummary(values);
  function save() {
    if (!summary) { setFeedback("월과 모든 항목을 입력해 주세요. 확인된 무수익·무료 항목만 0을 입력하세요."); return; }
    try {
      const ledger: Record<string, MonthlyFinance> = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      const next = { ...ledger, [values.month]: values };
      const months = Object.keys(next).sort().slice(-24);
      localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(months.map(month => [month, next[month]]))));
      setFeedback("이 브라우저에 저장했습니다.");
    } catch { setFeedback("이 브라우저에서 저장할 수 없습니다."); }
  }
  function load() {
    try {
      const entry = JSON.parse(localStorage.getItem(KEY) ?? "{}")[values.month] as MonthlyFinance | undefined;
      if (!entry || financeFields.some(key => typeof entry[key] !== "string") || !financeSummary(entry)) {
        setFeedback("선택한 월의 저장된 내역이 없습니다."); return;
      }
      setValues(entry); setFeedback("저장된 내역을 불러왔습니다.");
    } catch { setFeedback("저장된 내역을 불러올 수 없습니다."); }
  }
  return <section className="rounded-xl border bg-white p-5 shadow-sm" aria-labelledby="monthly-finance-title">
    <h2 id="monthly-finance-title" className="text-lg font-black">월별 수익·운영비</h2>
    <p className="mt-1 text-sm text-slate-600">청구서·수익 보고서의 실제 금액을 원화로 입력하세요. 빈칸은 미확인입니다. 도메인 연간 비용은 12로 나눠 입력합니다. 계정·지급 정보는 입력하지 않습니다.</p>
    <label className="mt-4 block max-w-xs text-sm font-bold">집계 월
      <input type="month" value={values.month} onChange={event => setValues({ ...values, month: event.target.value })} className="mt-1 block min-h-11 w-full rounded-lg border px-3" />
    </label>
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {financeFields.map(key => <label key={key} className="text-sm font-bold">{labels[key]} (원)
        <input type="number" min="0" max="1000000000" step="0.01" inputMode="decimal" placeholder="미확인" value={values[key]}
          onChange={event => setValues({ ...values, [key]: event.target.value })} className="mt-1 block min-h-11 w-full rounded-lg border px-3 font-normal" />
      </label>)}
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" onClick={save} className="min-h-11 rounded-lg bg-blue-700 px-3 text-sm font-bold text-white">이 브라우저에 저장</button>
      <button type="button" onClick={load} className="min-h-11 rounded-lg border px-3 text-sm font-bold">선택 월 불러오기</button>
      <p className="text-sm font-bold" role="status">{summary ? `수익 ${summary.revenue.toLocaleString("ko-KR")}원 · 비용 ${summary.costs.toLocaleString("ko-KR")}원 · 차액 ${summary.profit.toLocaleString("ko-KR")}원` : "수익·비용 차액: 미확인"}</p>
    </div>
    <p className="mt-2 text-xs text-slate-500">직접 입력한 관리용 계산입니다. 세금 신고용 장부나 광고 수익 예상치가 아닙니다. 서버에 전송하지 않으며 다른 브라우저에는 동기화되지 않습니다.</p>
    {feedback ? <p className="mt-2 text-sm" role="status">{feedback}</p> : null}
  </section>;
}
