import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "../../../db";
import { withApiMonitoring } from "../../../server/observability";
import { rejectRateLimitedRequest } from "../../../server/rateLimit";

// This diagnostic is confined to the unmerged, access-protected Netlify PR.
// Report only allowlisted error codes and presence bits, never connection data.
const safeConnectionErrorCodes = new Set([
  "28P01", "28000", "3D000", "42501", "57P03",
  "ETIMEDOUT", "ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT", "ERR_TLS_CERT_ALTNAME_INVALID",
  "CERT_HAS_EXPIRED", "ERR_SSL_WRONG_VERSION_NUMBER",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "CERTIFICATE_VERIFY_FAILED",
]);

function previewDatabaseDiagnostic(error: unknown) {
  if (process.env.NEXT_PUBLIC_BRAWLOOP_STAGING !== "1") {
    return undefined;
  }
  const code = error !== null && typeof error === "object" && "code" in error
    ? error.code : undefined;
  return {
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    tlsCaConfigured: Boolean(process.env.DATABASE_SSL_CA),
    errorCode: typeof code === "string" && safeConnectionErrorCodes.has(code)
      ? code : "unclassified",
    errorType: error instanceof TypeError ? "TypeError" : error instanceof Error ? "Error" : "Unknown",
  };
}

async function getHealth(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "health", {
    limit: 30,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.BRAWLOOP_NETLIFY_COMMIT_SHA;
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
  } catch (error) {
    const diagnostic = previewDatabaseDiagnostic(error);
    return NextResponse.json(
      {
        status: "degraded",
        checks: { database: { ok: false } },
        ...(diagnostic ? { diagnostic } : {}),
      },
      { status: 503, headers },
    );
  }
}

export const GET = withApiMonitoring("api.health", getHealth, { slowMs: 750 });
