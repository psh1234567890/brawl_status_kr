import { readFile, appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const REPO = "psh1234567890/brawl_status_kr";
const OWNER = "psh1234567890";
const marker = "<!-- brawloop-production-alert:v1 -->";
const failures = new Set(["failure", "timed_out", "action_required", "startup_failure"]);

// Never interpolate event titles, URLs, log output or branch names into an issue.
export function productionSignal(name, event, ref) {
  if (event.repository?.full_name !== REPO) return null;
  if (name === "workflow_dispatch" && ref === "refs/heads/main") {
    if (!["alert", "recover"].includes(event.inputs?.drill)) return null;
    return { kind: "drill", failed: event.inputs.drill === "alert" };
  }
  if (name === "workflow_run") {
    const run = event.workflow_run;
    if (run?.head_repository?.full_name !== REPO || run.head_branch !== "main" ||
        run.status !== "completed" || !Number.isSafeInteger(run.id)) return null;
    const kind = run.name === "CI" && run.event === "push" ? "ci" :
      run.name === "Production smoke" && ["deployment_status", "workflow_dispatch"].includes(run.event) ? "smoke" : null;
    if (!kind || !(failures.has(run.conclusion) || run.conclusion === "success")) return null;
    return { kind, failed: failures.has(run.conclusion), sha: run.head_sha, runId: run.id };
  }
  if (name === "deployment_status" && event.deployment?.environment === "Production" &&
      event.deployment.creator?.login === "vercel[bot]" &&
      ["failure", "error"].includes(event.deployment_status?.state)) {
    return { kind: "deploy", failed: true, sha: event.deployment.sha };
  }
  return null;
}

export async function handleProductionAlert({ name, event, ref, runId, token, fetchImpl = fetch }) {
  const signal = productionSignal(name, event, ref);
  if (!signal) return { action: "ignored" };
  if (!token) throw new Error("Missing scoped GitHub token");
  async function api(path, method = "GET", body) {
    const response = await fetchImpl(`https://api.github.com/repos/${REPO}/${path}`, {
      method, redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`GitHub request failed: ${response.status}`);
    return response.json();
  }
  const current = await api("git/ref/heads/main");
  signal.sha ??= current.object?.sha;
  if (!/^[a-f0-9]{40}$/.test(signal.sha ?? "") || signal.sha !== current.object?.sha) {
    return { action: "ignored-obsolete-commit" };
  }
  // A green workflow is insufficient for resolving a runtime/deploy incident:
  // the same commit must actually be serving on the canonical domain.
  if (!signal.failed && signal.kind === "smoke") {
    const health = await fetchImpl("https://www.brawl-o1.site/api/health", { redirect: "error", signal: AbortSignal.timeout(20_000) });
    if (!health.ok || health.headers.get("x-deployment-sha") !== signal.sha || (await health.json()).status !== "ok") {
      return { action: "ignored-unverified-recovery" };
    }
  }
  const kinds = signal.kind === "smoke" && !signal.failed ? ["smoke", "deploy"] : [signal.kind];
  const issues = [];
  // Page through every open issue so a busy repository cannot cause duplicates.
  for (let page = 1; ; page++) {
    const rows = await api(`issues?state=open&per_page=100&page=${page}`);
    issues.push(...rows.filter(issue => !issue.pull_request && issue.user?.login === "github-actions[bot]" && issue.body?.includes(marker)));
    if (rows.length < 100) break;
  }
  const title = kind => `${kind === "drill" ? "[TEST]" : "[Production]"} ${kind} · ${signal.sha.slice(0, 7)}`;
  const existing = issues.filter(issue => issue.body.includes(signal.sha) && kinds.some(kind => issue.title === title(kind)));
  if (!signal.failed) {
    for (const issue of existing) await api(`issues/${issue.number}`, "PATCH", { state: "closed", state_reason: "completed" });
    return { action: "resolved", count: existing.length };
  }
  if (existing.length) return { action: "already-open", issue: existing[0].number };
  const sourceId = signal.runId ?? Number(runId);
  if (!Number.isSafeInteger(sourceId) || sourceId <= 0) throw new Error("Invalid source run");
  const issue = await api("issues", "POST", {
    title: title(signal.kind), assignees: [OWNER],
    body: `${marker}\n\n${signal.kind === "drill" ? "알림 전달 시험입니다. 실제 장애가 아닙니다." : "운영 배포 또는 핵심 기능 검사가 실패했습니다."}\n\n- 구분: ${signal.kind}\n- Commit: ${signal.sha}\n- [검사 기록](https://github.com/${REPO}/actions/runs/${sourceId})\n- [진단·복구 절차](https://github.com/${REPO}/blob/main/docs/OPERATIONS.md)\n\n같은 commit·같은 실패는 중복 생성하지 않습니다. 같은 commit의 정상 검사 후 자동 종료합니다. 새 commit으로 복구했다면 이전 장애 이슈를 직접 확인하고 종료하세요.`,
  });
  return { action: "created", issue: issue.number };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await handleProductionAlert({ name: process.env.GITHUB_EVENT_NAME,
      event: JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8")),
      ref: process.env.GITHUB_REF, runId: process.env.GITHUB_RUN_ID, token: process.env.GITHUB_TOKEN });
    console.log(JSON.stringify(result));
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `Production alert: **${result.action}**${result.issue ? ` ([#${result.issue}](https://github.com/${REPO}/issues/${result.issue}))` : ""}\n`);
  } catch {
    console.error("Production alert delivery failed; inspect workflow permissions and GitHub availability.");
    process.exitCode = 1;
  }
}
