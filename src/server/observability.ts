type ApiMonitorOptions = {
  slowMs?: number;
};

type ApiHandler = (request: Request) => Response | Promise<Response>;

type OperationMonitorOptions = {
  slowMs?: number;
};

export type SkinSupplementalOutcome =
  | "disabled"
  | "fresh_cache"
  | "shared_request"
  | "provider_ready"
  | "stale_cache"
  | "unavailable"
  | "direct_failed_no_fallback"
  | "direct_failed_reader_fallback";

type SkinSupplementalLogDetails = {
  durationMs?: number;
  error?: unknown;
};

export function withApiMonitoring(
  route: string,
  handler: ApiHandler,
  options: ApiMonitorOptions = {},
) {
  const slowMs = options.slowMs ?? 1_500;

  return async function monitoredHandler(request: Request) {
    const requestId = getRequestId(request);
    const startedAt = performance.now();

    try {
      const response = await handler(request);
      const durationMs = elapsedMs(startedAt);
      response.headers.set("Server-Timing", `app;dur=${durationMs}`);
      response.headers.set("X-Request-Id", requestId);
      emitApiLog({
        event: "api_request",
        route,
        method: request.method,
        status: response.status,
        durationMs,
        requestId,
        slow: durationMs >= slowMs,
      });
      return response;
    } catch (error) {
      const durationMs = elapsedMs(startedAt);
      console.error(
        JSON.stringify({
          event: "api_uncaught_error",
          route,
          method: request.method,
          durationMs,
          requestId,
          errorName: error instanceof Error ? error.name : "UnknownError",
          deployment: deploymentContext(),
        }),
      );
      throw error;
    }
  };
}

export async function observeServerOperation<T>(
  operation: string,
  run: () => Promise<T>,
  options: OperationMonitorOptions = {},
) {
  const slowMs = options.slowMs ?? 2_500;
  const startedAt = performance.now();
  try {
    const result = await run();
    const durationMs = elapsedMs(startedAt);
    const payload = JSON.stringify({
      event: "server_operation",
      operation,
      ok: true,
      durationMs,
      slow: durationMs >= slowMs,
      deployment: deploymentContext(),
    });
    if (durationMs >= slowMs) console.warn(payload);
    else console.log(payload);
    return result;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "server_operation",
        operation,
        ok: false,
        durationMs: elapsedMs(startedAt),
        errorName: error instanceof Error ? error.name : "UnknownError",
        deployment: deploymentContext(),
      }),
    );
    throw error;
  }
}

export function logSkinSupplementalOutcome(
  outcome: SkinSupplementalOutcome,
  details: SkinSupplementalLogDetails = {},
) {
  const errorDetails = safeErrorDetails(details.error);
  const payload = JSON.stringify({
    event: "skin_supplemental",
    outcome,
    durationMs:
      typeof details.durationMs === "number"
        ? Math.round(details.durationMs * 10) / 10
        : undefined,
    ...errorDetails,
    deployment: deploymentContext(),
  });

  if (
    outcome === "unavailable" ||
    outcome === "stale_cache" ||
    outcome === "direct_failed_no_fallback" ||
    outcome === "direct_failed_reader_fallback"
  ) {
    console.warn(payload);
    return;
  }

  console.log(payload);
}

function emitApiLog(payload: {
  event: string;
  route: string;
  method: string;
  status: number;
  durationMs: number;
  requestId: string;
  slow: boolean;
}) {
  const message = JSON.stringify({ ...payload, deployment: deploymentContext() });
  if (payload.status >= 500) {
    console.error(message);
  } else if (payload.slow) {
    console.warn(message);
  } else {
    console.log(message);
  }
}

function getRequestId(request: Request) {
  const incoming = request.headers.get("x-request-id") ?? request.headers.get("x-vercel-id");
  if (incoming && /^[A-Za-z0-9._:-]{1,96}$/.test(incoming)) return incoming;
  return crypto.randomUUID();
}

function elapsedMs(startedAt: number) {
  return Math.round((performance.now() - startedAt) * 10) / 10;
}

function safeErrorDetails(error: unknown) {
  if (!error) return {};

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : undefined;

  return {
    errorName: error instanceof Error ? error.name : "UnknownError",
    status,
  };
}

function deploymentContext() {
  return {
    region: process.env.VERCEL_REGION || undefined,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
  };
}
