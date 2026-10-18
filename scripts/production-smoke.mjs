import { pathToFileURL } from "node:url";

export function smokeOrigin(value) {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      !(url.origin === "https://www.brawl-o1.site" ||
        local && url.protocol === "http:")) {
    throw new Error("Use the canonical production origin or an explicit loopback test server.");
  }
  return url.origin;
}

export async function runProductionSmoke({
  base = "https://www.brawl-o1.site", expectedSha, fetchImpl = fetch,
} = {}) {
  const origin = smokeOrigin(base);
  if (expectedSha !== undefined && !/^[a-f0-9]{40}$/.test(expectedSha)) {
    throw new Error("Expected deployment SHA must be a full commit hash.");
  }
  const results = [];
  async function check(name, path, validate, { html = false } = {}) {
    const started = performance.now();
    try {
      const response = await fetchImpl(new URL(path, origin), {
        redirect: "manual", signal: AbortSignal.timeout(20_000),
        headers: { "Accept-Language": "en", "User-Agent": "Brawloop-Production-Smoke/1.0" },
      });
      if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes(html ? "text/html" : "application/json")) {
        throw new Error("Unexpected content type");
      }
      const body = html ? await response.text() : await response.json();
      if (!validate(body, response)) throw new Error("Response contract failed");
      results.push({ name, ok: true, status: response.status, ms: Math.round(performance.now() - started) });
      return body;
    } catch (error) {
      // Fetch/parser errors can contain player URLs or response bodies. Only
      // report our own fixed categories; never log tags, names or raw payloads.
      const category = error instanceof Error && /^(HTTP \d{3}|Unexpected content type|Response contract failed)$/.test(error.message)
        ? error.message : "Request failed";
      results.push({ name, ok: false, category, ms: Math.round(performance.now() - started) });
      return undefined;
    }
  }
  const health = (body, response) => body?.status === "ok" && body.checks?.database?.ok === true &&
    (!expectedSha || response.headers.get("x-deployment-sha") === expectedSha);

  await Promise.all([
    check("database", "/api/health", health),
    check("recommendations", "/api/meta", body => Array.isArray(body) && body.every(map =>
      typeof map.mode === "string" && typeof map.map === "string" && Array.isArray(map.brawlers))),
    check("current-maps", "/api/events", body => Array.isArray(body?.active) && Array.isArray(body.upcoming) &&
      Number.isFinite(Date.parse(body.fetchedAt)) &&
      Math.abs(Date.now() - Date.parse(body.fetchedAt)) <= 10 * 60_000 &&
      body.active.every(event => typeof event.map === "string" && typeof event.mode === "string" &&
        Date.parse(event.startTime) <= Date.now() && Date.parse(event.endTime) > Date.now())),
    check("status-page", "/status", body => /<html[\s>]/i.test(body), { html: true }),
  ]);

  const rankings = await check("upstream-rankings", "/api/rankings?type=players&country=global", body =>
    Array.isArray(body?.items) && /^#[0289PYLQGRJCUV]+$/.test(body.items[0]?.tag));
  if (rankings) {
    const tag = encodeURIComponent(rankings.items[0].tag);
    await Promise.all([
      check("player-search", `/api/player?tag=${tag}`, body => body?.tag === rankings.items[0].tag &&
        typeof body.name === "string" && Array.isArray(body.brawlers)),
      check("recent-battles", `/api/player/matches?tag=${tag}`, body => Array.isArray(body?.items)),
    ]);
  }
  // Check again so a release changing during this run cannot validate a mix of
  // deployments. These checks never POST matches or modify account/community data.
  if (expectedSha) await check("deployment-still-current", "/api/health", health);
  return { checkedAt: new Date().toISOString(), origin, expectedSha, ok: results.every(result => result.ok), results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = await runProductionSmoke({
      base: process.env.SMOKE_BASE_URL, expectedSha: process.env.SMOKE_EXPECTED_SHA,
    });
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } catch {
    console.error("Production smoke configuration is invalid.");
    process.exitCode = 1;
  }
}
