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

  try {
    const latencyMs = await checkDatabaseHealth();
    return NextResponse.json(
      {
        status: "ok",
        checks: { database: { ok: true, latencyMs } },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        checks: { database: { ok: false } },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export const GET = withApiMonitoring("api.health", getHealth, { slowMs: 750 });
