"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandHeader from "./brand/BrandHeader";
import BrandFooter from "./brand/BrandFooter";
import { translateBrawlerName, translateMapName, translateModeName } from "../utils/brawlTranslations";
import styles from "./DraftRecommendation.module.css";

type Context = { map: string; mode: string; allies: string[]; opponents: string[] };
type Options = { season: number; trainingSets: number; sourceUrl: string; brawlers: string[];
  mapModes: [string, string][]; defaultContext: Context };
type Recommendation = { brawler: string; probability: number; trainingPlays: number; score: number };
type Result = { candidateCount: number; inferenceMs: number; modelRecommendations: Recommendation[];
  baselineRecommendations: Recommendation[] };
const modeNames: Record<string, string> = { gemGrab: "젬 그랩", brawlBall: "브롤 볼", bounty: "바운티", heist: "하이스트", hotZone: "핫 존", knockout: "녹아웃" };

export default function DraftRecommendation() {
  const [options, setOptions] = useState<Options | null>(null);
  const [context, setContext] = useState<Context | null>(null);
  const [banned, setBanned] = useState<string[]>([]);
  const [candidateSelection, setCandidateSelection] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/recommendation", { signal: controller.signal }).then(async (r) => {
      if (!r.ok) throw new Error("추천 설정을 불러오지 못했습니다.");
      return r.json() as Promise<Options>;
    }).then((data) => { setOptions(data); setContext(data.defaultContext); }).catch((e) => {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e.message);
    });
    return () => controller.abort();
  }, []);

  function updateContext(next: Context) { setContext(next); setResult(null); setError(""); }
  const selected = context ? [...context.allies, ...context.opponents] : [];
  const available = options?.brawlers.filter((b) => !selected.includes(b)) ?? [];
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!context) return;
    setBusy(true); setResult(null); setError("");
    try {
      const response = await fetch("/api/recommendation", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...context, banned: banned.filter((b) => !selected.includes(b)),
          ...(candidateSelection.length ? { candidates: candidateSelection } : {}) }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "추천을 계산하지 못했습니다.");
      setResult(json as Result);
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { setBusy(false); }
  }
  const brawlerSelect = (side: "allies" | "opponents", index: number) => context && options && (
    <label className={styles.field} key={`${side}-${index}`}>
      {side === "allies" ? "아군" : "상대"} {index + 1}
      <select aria-label={`${side === "allies" ? "아군" : "상대"} ${index + 1}`} value={context[side][index]} disabled={busy} onChange={(e) => {
        const team = [...context[side]]; team[index] = e.target.value;
        updateContext({ ...context, [side]: team });
      }}>
        {options.brawlers.map((b) => <option key={b} value={b} disabled={selected.includes(b) && context[side][index] !== b}>
          {translateBrawlerName(b, "ko")}
        </option>)}
      </select>
    </label>
  );
  return <div lang="ko" className={styles.page}>
    <BrandHeader locale="ko" />
    <main className={styles.main}>
      <Link className={styles.back} href="/meta">← 맵별 추천</Link>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>BRAWLOOP · 시즌 55 분석</p>
        <h1>우리 팀의 마지막 한 자리</h1>
        <p>맵과 양 팀 조합을 입력하면, 남은 브롤러의 예측 승리 확률을 비교할 수 있어요.</p>
        <p className={styles.scope}>2026년 10월 15~30일 경쟁전 기록 · 전원 파워 11 · 로지스틱 회귀</p>
      </header>
      {!options && !error ? <p role="status">추천 설정을 불러오는 중…</p> : null}
      {options && context ? <form onSubmit={submit} className={styles.form}>
        <label className={styles.field}>맵과 모드
          <select disabled={busy} value={JSON.stringify([context.map, context.mode])} onChange={(e) => {
            const [map, mode] = JSON.parse(e.target.value); updateContext({ ...context, map, mode });
          }}>
            {options.mapModes.map(([map, mode]) => <option key={`${map}:${mode}`} value={JSON.stringify([map,mode])}>
              {translateMapName(map,"ko")} · {modeNames[mode] ?? translateModeName(mode,"ko")}
            </option>)}
          </select>
        </label>
        <div className={styles.teams}>
          <fieldset><legend>우리 팀</legend><div className={styles.picks}>
            {[0,1].map((i) => brawlerSelect("allies",i))}<div className={styles.emptyPick}>? 추천할 자리</div>
          </div></fieldset>
          <fieldset><legend>상대 팀</legend><div className={styles.picks}>
            {[0,1,2].map((i) => brawlerSelect("opponents",i))}
          </div></fieldset>
        </div>
        <details className={styles.advanced}><summary>밴과 추천 후보 설정</summary>
          <p>선택한 다섯 브롤러와 밴한 브롤러는 추천에서 제외해요. 후보를 고르지 않으면 전체 브롤러를 비교해요.</p>
          <label className={styles.field}>밴한 브롤러
            <select aria-label="밴한 브롤러" multiple size={5} disabled={busy} value={banned.filter((b) => available.includes(b))} onChange={(e) => {
              setBanned(Array.from(e.target.selectedOptions, (o) => o.value)); setResult(null);
            }}>{available.map((b) => <option key={b} value={b}>{translateBrawlerName(b,"ko")}</option>)}</select>
          </label>
          <label className={styles.field}>추천받을 후보
            <select aria-label="추천받을 후보" multiple size={5} disabled={busy} value={candidateSelection.filter((b) => available.includes(b))} onChange={(e) => {
              setCandidateSelection(Array.from(e.target.selectedOptions, (o) => o.value)); setResult(null);
            }}>{available.map((b) => <option key={b} value={b}>{translateBrawlerName(b,"ko")}</option>)}</select>
          </label>
        </details>
        <button className={styles.submit} type="submit" disabled={busy}>{busy ? "비교하는 중…" : "브롤러 추천 비교하기"}</button>
      </form> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {result ? <section className={styles.results} aria-label="추천 비교 결과" aria-live="polite">
        <div className={styles.resultHeading}><h2>같은 후보, 두 가지 추천</h2><p>{result.candidateCount}명 비교 · 계산 {result.inferenceMs.toFixed(1)}ms</p></div>
        <div className={styles.columns}>
          <Ranking title="팀 조합 추천" description="맵과 아군·상대 조합을 반영한 예측 승리 확률" rows={result.modelRecommendations} model />
          <Ranking title="맵별 추천 방식" description="같은 학습 자료로 계산한 기존 추천 점수" rows={result.baselineRecommendations} />
        </div>
        <p className={styles.source}>두 방식 모두 {options?.trainingSets.toLocaleString("ko-KR")}세트의 학습 자료를 사용해요.
          {" "}<a href={options?.sourceUrl} target="_blank" rel="noreferrer">데이터 출처</a></p>
      </section> : null}
    </main>
    <BrandFooter locale="ko" />
  </div>;
}

function Ranking({ title, description, rows, model = false }: { title: string; description: string; rows: Recommendation[]; model?: boolean }) {
  return <div className={styles.ranking}><h3>{title}</h3><p>{description}</p><ol>
    {rows.map((r,i) => <li key={r.brawler}><span className={styles.rank}>{i+1}</span><div>
      <strong>{translateBrawlerName(r.brawler,"ko")}</strong><small>맵 학습 표본 {r.trainingPlays.toLocaleString("ko-KR")}건</small>
    </div><b>{model ? `${(r.probability*100).toFixed(2)}%` : `${r.score}점`}</b></li>)}
  </ol>{!rows.length ? <p>표본이 충분한 추천 후보가 없습니다.</p> : null}</div>;
}
