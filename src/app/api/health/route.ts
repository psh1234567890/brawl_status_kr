import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "../../../db";
import { withApiMonitoring } from "../../../server/observability";
import { rejectRateLimitedRequest } from "../../../server/rateLimit";

async function getHealth(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "health", {
    limit: 30,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  const commit = process.env.VERCEL_GIT_COMMIT_SHA;
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (commit && /^[a-f0-9]{40}$/.test(commit)) headers["X-Deployment-Sha"] = commit;

  try {
    const latencyMs = await checkDatabaseHealth();
    return NextResponse.json(
      {
        status: "ok",
        checks: { database: { ok: true, latencyMs } },
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        checks: { database: { ok: false } },
      },
      { status: 503, headers },
    );
  }
}

export const GET = withApiMonitoring("api.health", getHealth, { slowMs: 750 });
