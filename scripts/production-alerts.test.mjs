import { describe, expect, it } from "vitest";
import { handleProductionAlert, productionSignal } from "./production-alerts.mjs";

const repo = { full_name: "psh1234567890/brawl_status_kr" };
const sha = "a".repeat(40);
const run = { repository: repo, workflow_run: { id: 123, name: "CI", event: "push", head_branch: "main", head_repository: repo, status: "completed", conclusion: "failure", head_sha: sha } };
function fixture({ existing = [], current = sha, live = sha } = {}) {
  const calls = [];
  return { calls, fetchImpl: async (url, options = {}) => {
    calls.push({ url, ...options });
    if (url.includes("/api/health")) return Response.json({ status: "ok" }, { headers: { "x-deployment-sha": live } });
    if (url.includes("git/ref/heads/main")) return Response.json({ object: { sha: current } });
    if (url.includes("issues?")) return Response.json(existing);
    return Response.json({ number: 42 });
  } };
}
const options = { name: "workflow_run", event: run, runId: "456", token: "test-token" };

describe("production alerts", () => {
  it("assigns a sanitized failure to the owner and ignores untrusted log/title/URL fields", async () => {
    const mock = fixture();
    expect(await handleProductionAlert({ ...options, ...mock })).toEqual({ action: "created", issue: 42 });
    const created = JSON.parse(mock.calls.find(call => call.method === "POST").body);
    expect(created.assignees).toEqual(["psh1234567890"]);
    expect(created.body).toContain("/actions/runs/123");
    expect(created.title).toBe("[Production] ci · aaaaaaa");
  });
  it("ignores PR/fork workflows, cancellations and obsolete commits", async () => {
    for (const change of [{ event: "pull_request" }, { head_branch: "feature" }, { head_repository: { full_name: "evil/fork" } }, { conclusion: "cancelled" }]) {
      expect(productionSignal("workflow_run", { ...run, workflow_run: { ...run.workflow_run, ...change } })).toBeNull();
    }
    const mock = fixture({ current: "b".repeat(40) });
    expect(await handleProductionAlert({ ...options, ...mock })).toEqual({ action: "ignored-obsolete-commit" });
    expect(mock.calls).toHaveLength(1);
  });
  it("does not duplicate an existing bot incident", async () => {
    const mock = fixture({ existing: [{ number: 42, user: { login: "github-actions[bot]" }, title: "[Production] ci · aaaaaaa", body: `<!-- brawloop-production-alert:v1 --> ${sha}` }] });
    expect(await handleProductionAlert({ ...options, ...mock })).toEqual({ action: "already-open", issue: 42 });
    expect(mock.calls.some(call => call.method === "POST")).toBe(false);
  });
  it("resolves a successful rerun only after verifying the same live runtime commit", async () => {
    const event = { ...run, workflow_run: { ...run.workflow_run, name: "Production smoke", event: "deployment_status", conclusion: "success" } };
    const mock = fixture({ live: "b".repeat(40) });
    expect(await handleProductionAlert({ ...options, event, ...mock })).toEqual({ action: "ignored-unverified-recovery" });
    expect(mock.calls.some(call => call.method === "PATCH")).toBe(false);
    const good = fixture({ existing: [{ number: 42, user: { login: "github-actions[bot]" }, title: "[Production] smoke · aaaaaaa", body: `<!-- brawloop-production-alert:v1 --> ${sha}` }] });
    expect(await handleProductionAlert({ ...options, event, ...good })).toEqual({ action: "resolved", count: 1 });
    expect(good.calls.some(call => call.method === "PATCH")).toBe(true);
  });
  it("separates notification drills from real runtime incidents", async () => {
    const mock = fixture();
    expect(await handleProductionAlert({ ...options, name: "workflow_dispatch", ref: "refs/heads/main", event: { repository: repo, inputs: { drill: "alert" } }, ...mock })).toEqual({ action: "created", issue: 42 });
    expect(JSON.parse(mock.calls.find(call => call.method === "POST").body).title).toBe("[TEST] drill · aaaaaaa");
    expect(productionSignal("workflow_dispatch", { repository: repo, inputs: { drill: "alert" } }, "refs/heads/evil")).toBeNull();
  });
});
