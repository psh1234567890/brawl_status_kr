import { describe, expect, it } from "vitest";
import { runProductionSmoke, smokeOrigin } from "./production-smoke.mjs";

const sha = "a".repeat(40);
function fixtureFetch({ brokenMeta = false, commit = sha } = {}) {
  return async url => {
    const pathname = url.pathname;
    if (pathname === "/status") return new Response("<html lang='en'><body>Status</body></html>", { headers: { "content-type": "text/html" } });
    const body = {
      "/api/health": { status: "ok", checks: { database: { ok: true } } },
      "/api/meta": [],
      "/api/events": { active: [], upcoming: [], fetchedAt: new Date().toISOString() },
      "/api/rankings": { items: [{ tag: "#PYLQGR" }] },
      "/api/player": { tag: "#PYLQGR", name: "Fixture", brawlers: [] },
      "/api/player/matches": { items: [] },
    }[pathname];
    return Response.json(body, {
      status: brokenMeta && pathname === "/api/meta" ? 503 : 200,
      headers: { "x-deployment-sha": commit },
    });
  };
}

describe("production smoke", () => {
  it("checks real response contracts and the intended deployment without logging player identifiers", async () => {
    const report = await runProductionSmoke({ expectedSha: sha, fetchImpl: fixtureFetch() });
    expect(report.ok).toBe(true);
    expect(report.results).toHaveLength(8);
    expect(JSON.stringify(report)).not.toContain("PYLQGR");
  });
  it("fails if recommendations are unavailable even when DB health is green", async () => {
    const report = await runProductionSmoke({ fetchImpl: fixtureFetch({ brokenMeta: true }) });
    expect(report.ok).toBe(false);
    expect(report.results).toContainEqual(expect.objectContaining({ name: "recommendations", ok: false, category: "HTTP 503" }));
  });
  it("rejects a different deployment instead of passing checks against the previous version", async () => {
    const report = await runProductionSmoke({ expectedSha: sha, fetchImpl: fixtureFetch({ commit: "b".repeat(40) }) });
    expect(report.ok).toBe(false);
  });
  it("never follows redirects to a login page or external service", async () => {
    const report = await runProductionSmoke({ fetchImpl: async (_url, options) => {
      expect(options.redirect).toBe("manual");
      return new Response(null, { status: 302, headers: { location: "https://example.test/login" } });
    } });
    expect(report.ok).toBe(false);
  });
  it("rejects arbitrary destinations and embedded credentials", () => {
    for (const url of ["https://example.test", "https://www.brawl-o1.site.evil.test", "https://user:secret@www.brawl-o1.site", "https://www.brawl-o1.site?secret=value"]) {
      expect(() => smokeOrigin(url)).toThrow();
    }
  });
});
