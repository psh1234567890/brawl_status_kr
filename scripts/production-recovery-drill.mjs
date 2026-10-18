import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { runProductionSmoke } from "./production-smoke.mjs";

// Deliberately isolated: no production URL, database connection or credentials.
export async function runRecoveryDrill() {
  const good = "a".repeat(40), broken = "b".repeat(40);
  let current = good;
  const server = createServer((req, res) => {
    const path = new URL(req.url, "http://localhost").pathname;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("X-Deployment-Sha", current);
    const data = {
      "/api/health": { status: "ok", checks: { database: { ok: true } } },
      "/api/meta": [],
      "/api/events": { active: [], upcoming: [], fetchedAt: new Date().toISOString() },
      "/api/rankings": { items: [{ tag: "#PYLQGR" }] },
      "/api/player": { tag: "#PYLQGR", name: "Local fixture", brawlers: [] },
      "/api/player/matches": { items: [] },
    }[path];
    if (path === "/status") {
      res.setHeader("Content-Type", "text/html");
      res.end("<html><body>Isolated recovery fixture</body></html>");
    } else {
      res.statusCode = path === "/api/meta" && current === broken ? 503 : data ? 200 : 404;
      res.end(JSON.stringify(data ?? { error: "Not found" }));
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const before = await runProductionSmoke({ base, expectedSha: good });
    current = broken;
    const failure = await runProductionSmoke({ base, expectedSha: broken });
    current = good;
    const restored = await runProductionSmoke({ base, expectedSha: good });
    const wrongSha = await runProductionSmoke({ base, expectedSha: broken });
    const result = { isolated: true, baseline: before.ok,
      failureDetected: !failure.ok && failure.results.some(item => item.name === "recommendations" && !item.ok),
      restored: restored.ok, wrongCommitRejected: !wrongSha.ok };
    if (!Object.values(result).every(Boolean)) throw new Error("Recovery drill failed");
    return result;
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await runRecoveryDrill())); }
  catch { console.error("Isolated recovery drill failed."); process.exitCode = 1; }
}
